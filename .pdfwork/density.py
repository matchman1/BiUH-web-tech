import re, zlib, sys

path = sys.argv[1]
data = open(path, "rb").read()

# 收集所有内容流的解压结果
streams = []
for m in re.finditer(rb"stream\r?\n", data):
    start = m.end()
    end = data.find(b"endstream", start)
    if end == -1:
        continue
    try:
        streams.append(zlib.decompress(data[start:end]))
    except Exception:
        pass

print("解压出", len(streams), "个流\n")

# 按内容密度排序，找出「有内容」的流
rows = []
for i, s in enumerate(streams):
    paths = len(re.findall(rb"\s(m|l|c)\s", s))
    # 每个内容流开头的 cm 矩阵能反映页面尺寸
    rows.append((paths, i, len(s)))

rows.sort(reverse=True)
print("按路径数排序（前 25 个流）：")
for paths, i, size in rows[:25]:
    print(f"  流 {i:3d}  路径 {paths:6d}  解压后 {size:8d} 字节")

print("\n所有流的路径数分布：")
tot = sum(r[0] for r in rows)
print(f"  合计 {tot} 条路径")
low = sum(1 for r in rows if r[0] < 200)
print(f"  路径数 < 200 的流（大概是空页/纯图页）: {low} 个")
