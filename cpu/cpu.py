import pandas as pd
import re
import sqlite3
from pathlib import Path

# ---------- 辅助函数 ----------
def parse_freq(val):
    """将带单位的频率转为浮点数（GHz）"""
    if pd.isna(val):
        return None
    s = str(val).strip().lower()
    m = re.search(r'([\d.]+)\s*(ghz|mhz|hz)?', s)
    if not m:
        return None
    num = float(m.group(1))
    unit = m.group(2) or 'ghz'
    if unit.startswith('m'):
        num /= 1000
    return round(num, 2)

def parse_cache(val):
    """将缓存大小转为MB"""
    if pd.isna(val):
        return None
    s = str(val).strip()
    m = re.search(r'([\d.]+)\s*(mb|kb)?', s, re.I)
    if not m:
        return None
    num = float(m.group(1))
    unit = (m.group(2) or 'mb').lower()
    if unit == 'kb':
        num /= 1024
    return round(num, 2)

def parse_tdp(val):
    """提取TDP数值（W），范围取最大值"""
    if pd.isna(val):
        return None
    s = str(val).strip().replace('W', '').replace('w', '')
    nums = re.findall(r'[\d.]+', s)
    if not nums:
        return None
    return max(map(float, nums))

def parse_boolean(val):
    if pd.isna(val):
        return None
    s = str(val).strip().lower()
    if s in ('yes', 'true', '1', 'y'):
        return True
    if s in ('no', 'false', '0', 'n'):
        return False
    return None

def extract_number(val):
    if pd.isna(val):
        return None
    nums = re.findall(r'[\d.]+', str(val))
    return int(float(nums[0])) if nums else None

def parse_lithography(val):
    if pd.isna(val):
        return None
    s = str(val).strip()
    m = re.search(r'(\d+)\s*nm', s, re.I)
    return int(m.group(1)) if m else None

def parse_max_mem(val):
    if pd.isna(val):
        return None
    s = str(val).strip()
    m = re.search(r'([\d.]+)\s*(tb|gb|mb)', s, re.I)
    if m:
        num = float(m.group(1))
        unit = m.group(2).lower()
        if unit == 'tb':
            num *= 1024
        elif unit == 'mb':
            num /= 1024
        return int(num)
    return None

# ---------- 清洗 AMD CSV（按索引提取，最可靠） ----------
def clean_amd(filepath):
    df = pd.read_csv(filepath, encoding='utf-8-sig', header=0)
    # 列索引（从0开始）根据文件内容固定
    # 0: 空, 1: 空, 2: Model, 3: Family, 4: Line, 5: Platform, ... 
    # 具体参考文件片段
    idx_map = {
        'cpu_model': 2,
        'series_raw': 3,
        'series_detail': 4,
        'platform': 5,
        'release_time': 9,
        'cores': 10,
        'threads': 11,
        'base_freq': 13,
        'boost_freq': 14,
        'cache_l3': 18,
        'overclocking': 20,
        'manufacturing': 21,
        'socket': 22,
        'tdp': 28,
        'memory_type': 33,
        'memory_channels': 34,
        'igpu': 37
    }
    # 提取这些列，并重命名
    sub_df = df.iloc[:, list(idx_map.values())].copy()
    sub_df.columns = list(idx_map.keys())

    # 解析字段
    sub_df['cores'] = sub_df['cores'].apply(extract_number)
    sub_df['threads'] = sub_df['threads'].apply(extract_number)
    sub_df['base_freq'] = sub_df['base_freq'].apply(parse_freq)
    sub_df['boost_freq'] = sub_df['boost_freq'].apply(parse_freq)
    sub_df['cache_l3'] = sub_df['cache_l3'].apply(parse_cache)
    sub_df['overclocking'] = sub_df['overclocking'].apply(parse_boolean)
    sub_df['tdp'] = sub_df['tdp'].apply(parse_tdp)
    sub_df['manufacturing'] = sub_df['manufacturing'].apply(parse_lithography)
    sub_df['memory_channels'] = sub_df['memory_channels'].apply(extract_number)

    # 系列：从series_raw提取（去掉前缀）
    sub_df['series'] = sub_df['series_raw'].str.replace('AMD ', '').str.replace(' Processors', '').str.strip()
    # 架构（留空）
    sub_df['architecture'] = None
    # 超线程：暂时无法判断，留空
    sub_df['hyper_threading'] = None
    # 其他默认空
    sub_df['instruction_set'] = None
    sub_df['pcie_version'] = None
    sub_df['pcie_lanes'] = None
    sub_df['package'] = None
    sub_df['die_size'] = None
    sub_df['transistor_count'] = None
    sub_df['max_memory'] = None
    sub_df['max_memory_speed'] = None
    sub_df['ecc_support'] = None
    sub_df['registered_memory'] = None
    sub_df['numa_nodes'] = None
    sub_df['chipset'] = None
    # igpu已有

    return sub_df

# ---------- 清洗 CPU-World CSV ----------
def clean_cpuworld(filepath):
    df = pd.read_csv(filepath, encoding='utf-8-sig')
    # 使用列名映射（这些列名较规范）
    target_cols = {
        'CpuName': 'cpu_model',
        'Family': 'series_raw',
        'Microarchitecture': 'architecture',
        'Manufacturing process': 'manufacturing_raw',
        'The number of CPU cores': 'cores',
        'The number of threads': 'threads',
        'Frequency': 'base_freq',
        'Maximum turbo frequency': 'boost_freq',
        'Thermal Design Power': 'tdp',
        'Level 3 cache size': 'cache_l3',
        'Instruction set': 'instruction_set',
        'Socket': 'socket',
        'Physical memory': 'max_memory',
        'Multiprocessing': 'numa_nodes',
        'Platform': 'platform',
        'Introduction date': 'release_time',
        'Market segment': 'market_segment',
    }
    # 只取存在的列
    use_cols = [c for c in target_cols.keys() if c in df.columns]
    sub_df = df[use_cols].rename(columns=target_cols)

    # 解析
    sub_df['cores'] = sub_df['cores'].apply(extract_number)
    sub_df['threads'] = sub_df['threads'].apply(extract_number)
    sub_df['base_freq'] = sub_df['base_freq'].apply(parse_freq)
    sub_df['boost_freq'] = sub_df['boost_freq'].apply(parse_freq)
    sub_df['tdp'] = sub_df['tdp'].apply(parse_tdp)
    sub_df['cache_l3'] = sub_df['cache_l3'].apply(parse_cache)
    sub_df['manufacturing'] = sub_df['manufacturing_raw'].apply(parse_lithography)
    sub_df['series'] = sub_df['series_raw'].str.replace('Intel ', '').str.strip()
    sub_df['hyper_threading'] = (sub_df['threads'] > sub_df['cores']).map({True: True, False: False})
    sub_df['platform'] = sub_df['platform'].fillna(sub_df['market_segment'])
    sub_df['max_memory'] = sub_df['max_memory'].apply(parse_max_mem)
    # numa_nodes：从'Up to 2 processors'提取数字
    sub_df['numa_nodes'] = sub_df['numa_nodes'].apply(lambda x: int(re.search(r'\d+', str(x)).group(0)) if pd.notna(x) and re.search(r'\d+', str(x)) else None)

    # 补全缺失字段
    sub_df['overclocking'] = None
    sub_df['pcie_version'] = None
    sub_df['pcie_lanes'] = None
    sub_df['package'] = None
    sub_df['die_size'] = None
    sub_df['transistor_count'] = None
    sub_df['memory_type'] = None
    sub_df['memory_channels'] = None
    sub_df['max_memory_speed'] = None
    sub_df['ecc_support'] = None
    sub_df['registered_memory'] = None
    sub_df['chipset'] = None
    sub_df['igpu'] = None

    return sub_df

# ---------- 清洗 Intel 部分 CSV ----------
def clean_intel(filepath):
    df = pd.read_csv(filepath, encoding='utf-8-sig')
    target_cols = {
        'CpuName': 'cpu_model',
        'CodeNameText': 'architecture',
        'CoreCount': 'cores',
        'ThreadCount': 'threads',
        'ClockSpeed': 'base_freq',
        'ClockSpeedMax': 'boost_freq',
        'ProcessorBasePower': 'tdp_raw',
        'MaxTDP': 'tdp_raw2',
        'Cache': 'cache_l3_raw',
        'InstructionSet': 'instruction_set',
        'Lithography': 'manufacturing_raw',
        'MemoryTypes': 'memory_type',
        'MaxMem': 'max_memory',
        'MemoryMaxSpeedMhz': 'max_memory_speed',
        'NumMemoryChannels': 'memory_channels',
        'PCIExpressRevision': 'pcie_version',
        'SocketsSupported': 'socket',
        'BornOnDate': 'release_time',
        'MarketSegment': 'platform',
        'HyperThreading': 'hyper_threading',
    }
    use_cols = [c for c in target_cols.keys() if c in df.columns]
    sub_df = df[use_cols].rename(columns=target_cols)

    # 解析
    sub_df['cores'] = sub_df['cores'].apply(extract_number)
    sub_df['threads'] = sub_df['threads'].apply(extract_number)
    sub_df['base_freq'] = sub_df['base_freq'].apply(parse_freq)
    sub_df['boost_freq'] = sub_df['boost_freq'].apply(parse_freq)

    if 'tdp_raw' in sub_df.columns:
        sub_df['tdp'] = sub_df['tdp_raw'].apply(parse_tdp)
    if 'tdp_raw2' in sub_df.columns and sub_df['tdp'].isna().all():
        sub_df['tdp'] = sub_df['tdp_raw2'].apply(parse_tdp)

    sub_df['cache_l3'] = sub_df['cache_l3_raw'].apply(parse_cache)
    sub_df['manufacturing'] = sub_df['manufacturing_raw'].apply(parse_lithography)
    sub_df['hyper_threading'] = sub_df['hyper_threading'].apply(parse_boolean)

    # 提取系列
    def extract_series(name):
        if pd.isna(name):
            return None
        parts = str(name).split()
        if 'Core' in parts:
            idx = parts.index('Core')
            return ' '.join(parts[idx:idx+2]) if idx+1 < len(parts) else 'Core'
        return parts[0] if parts else None
    sub_df['series'] = sub_df['cpu_model'].apply(extract_series)

    sub_df['max_memory'] = sub_df['max_memory'].apply(parse_max_mem)
    sub_df['max_memory_speed'] = sub_df['max_memory_speed'].apply(extract_number)
    sub_df['memory_channels'] = sub_df['memory_channels'].apply(extract_number)
    sub_df['pcie_version'] = sub_df['pcie_version'].astype(str).str.replace('Rev', '').str.strip()
    sub_df['platform'] = sub_df['platform'].fillna('Desktop')

    # 默认空
    sub_df['overclocking'] = None
    sub_df['pcie_lanes'] = None
    sub_df['package'] = None
    sub_df['die_size'] = None
    sub_df['transistor_count'] = None
    sub_df['ecc_support'] = None
    sub_df['registered_memory'] = None
    sub_df['numa_nodes'] = None
    sub_df['chipset'] = None
    sub_df['igpu'] = None

    return sub_df

# ---------- 主流程 ----------
def main():
    try:
        amd = clean_amd('amd-cpus.csv')
        cw = clean_cpuworld('cpuworld-cpus.csv')
        intel = clean_intel('intel-cpus.csv')
    except Exception as e:
        print("清洗过程中发生错误，请检查文件是否存在：", e)
        return

    final_cols = [
        'cpu_model', 'series', 'architecture', 'platform', 'manufacturing',
        'cores', 'threads', 'hyper_threading', 'base_freq', 'boost_freq',
        'overclocking', 'tdp', 'cache_l3', 'instruction_set',
        'pcie_version', 'pcie_lanes', 'package', 'die_size', 'transistor_count',
        'memory_type', 'max_memory', 'memory_channels', 'max_memory_speed',
        'ecc_support', 'registered_memory', 'numa_nodes',
        'socket', 'chipset', 'release_time', 'igpu'
    ]

    for df in [amd, cw, intel]:
        for col in final_cols:
            if col not in df.columns:
                df[col] = None

    combined = pd.concat([amd, cw, intel], ignore_index=True, sort=False)
    combined = combined[final_cols]

    # 输出
    combined.to_csv('cleaned_cpus.csv', index=False, encoding='utf-8-sig')
    conn = sqlite3.connect('cpus.db')
    combined.to_sql('cpus', conn, if_exists='replace', index=False)
    conn.close()

    print(f"清洗完成！共 {len(combined)} 条记录，已保存到 cleaned_cpus.csv 和 cpus.db")

if __name__ == '__main__':
    main()