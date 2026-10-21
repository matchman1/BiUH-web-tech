import tkinter as tk
from tkinter import ttk, messagebox
import sqlite3
import re
import requests
from bs4 import BeautifulSoup
import time
import json
from urllib.parse import quote

class CPUSearchApp:
    def __init__(self, root, db_path='cpus.db'):
        self.root = root
        self.root.title("CPU 数据库浏览器")
        self.root.geometry("980x750")
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cpus'")
        if not self.cursor.fetchone():
            messagebox.showerror("错误", "数据库中未找到 'cpus' 表，请先运行清洗程序生成数据。")
            root.destroy()
            return

        self.field_names = {
            'cpu_model': 'CPU型号',
            'series': '系列',
            'architecture': '架构',
            'platform': '平台',
            'manufacturing': '制程 (nm)',
            'cores': '物理核心数',
            'threads': '线程数',
            'hyper_threading': '超线程',
            'base_freq': '基础频率 (GHz)',
            'boost_freq': '最大加速频率 (GHz)',
            'overclocking': '超频支持',
            'tdp': '热设计功耗 (W)',
            'cache_l3': 'L3缓存 (MB)',
            'instruction_set': '指令集',
            'pcie_version': 'PCIe版本',
            'pcie_lanes': 'PCIe通道数',
            'package': '封装类型',
            'die_size': 'Die芯片面积 (mm²)',
            'transistor_count': '晶体管数量',
            'memory_type': '支持内存类型',
            'max_memory': '最大支持内存 (GB)',
            'memory_channels': '内存通道数',
            'max_memory_speed': '最大内存速率 (MT/s)',
            'ecc_support': 'ECC支持',
            'registered_memory': 'Registered支持',
            'numa_nodes': 'NUMA节点数',
            'socket': '接口/插槽',
            'chipset': '支持芯片组',
            'release_time': '发布时间',
            'igpu': '集成显卡'
        }
        self.clickable_fields = ['architecture', 'socket', 'series', 'platform', 'package', 'chipset']

        self.compare_list = []
        self.current_detail_model = None

        self.create_widgets()
        self.update_list()

    # -------------------- UI 创建 --------------------
    def create_widgets(self):
        main_pane = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        main_pane.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        left_frame = ttk.Frame(main_pane)
        main_pane.add(left_frame, weight=1)

        ttk.Label(left_frame, text="搜索 CPU：").pack(anchor='w', pady=(0,2))
        self.search_var = tk.StringVar()
        self.search_var.trace_add('write', lambda *args: self.update_list())
        entry = ttk.Entry(left_frame, textvariable=self.search_var)
        entry.pack(fill='x', pady=(0,5))
        entry.focus()

        list_frame = ttk.Frame(left_frame)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=(0,5))
        scroll = ttk.Scrollbar(list_frame, orient=tk.VERTICAL)
        self.listbox = tk.Listbox(list_frame, yscrollcommand=scroll.set, font=('Consolas', 10))
        scroll.config(command=self.listbox.yview)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.listbox.bind('<<ListboxSelect>>', self.on_select)
        self.listbox.bind('<Double-Button-1>', self.add_selected_to_compare)

        self.status_label = ttk.Label(left_frame, text="")
        self.status_label.pack(anchor='w')

        ttk.Separator(left_frame, orient='horizontal').pack(fill='x', pady=5)

        ttk.Label(left_frame, text="对比列表（双击移除）", font=('Arial', 10, 'bold')).pack(anchor='w')
        compare_frame = ttk.Frame(left_frame)
        compare_frame.pack(fill=tk.BOTH, expand=True, pady=(0,5))
        compare_scroll = ttk.Scrollbar(compare_frame, orient=tk.VERTICAL)
        self.compare_listbox = tk.Listbox(compare_frame, yscrollcommand=compare_scroll.set, font=('Consolas', 10))
        compare_scroll.config(command=self.compare_listbox.yview)
        compare_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.compare_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.compare_listbox.bind('<Double-Button-1>', self.remove_selected_from_compare)

        btn_frame = ttk.Frame(left_frame)
        btn_frame.pack(fill='x', pady=2)
        ttk.Button(btn_frame, text="加入选中", command=self.add_selected_to_compare).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="移除选中", command=self.remove_selected_from_compare).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="上移", command=self.move_up).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="下移", command=self.move_down).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="清空对比", command=self.clear_compare).pack(side=tk.LEFT, padx=2)

        ttk.Button(left_frame, text="开始对比", command=self.compare_selected).pack(fill='x', pady=5)

        right_frame = ttk.Frame(main_pane)
        main_pane.add(right_frame, weight=2)

        top_btn_frame = ttk.Frame(right_frame)
        top_btn_frame.pack(fill='x', pady=2)
        self.update_btn = ttk.Button(top_btn_frame, text="从英特尔官网更新此CPU", command=self.update_from_intel)
        self.update_btn.pack(side=tk.LEFT, padx=5)
        self.update_status_label = ttk.Label(top_btn_frame, text="", foreground="blue")
        self.update_status_label.pack(side=tk.LEFT, padx=5)

        detail_container = ttk.Frame(right_frame)
        detail_container.pack(fill=tk.BOTH, expand=True)
        self.detail_canvas = tk.Canvas(detail_container)
        detail_scroll = ttk.Scrollbar(detail_container, orient=tk.VERTICAL, command=self.detail_canvas.yview)
        self.detail_inner = ttk.Frame(self.detail_canvas)
        self.detail_canvas.create_window((0,0), window=self.detail_inner, anchor='nw')
        self.detail_canvas.configure(yscrollcommand=detail_scroll.set)
        self.detail_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        detail_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.detail_inner.bind("<Configure>", lambda e: self.detail_canvas.configure(scrollregion=self.detail_canvas.bbox("all")))

        self.placeholder = ttk.Label(self.detail_inner, text="← 请从左侧列表选择一个 CPU", font=('Arial', 14))
        self.placeholder.pack(pady=50)

    # -------------------- 主列表 --------------------
    def update_list(self):
        keyword = self.search_var.get().strip()
        if keyword:
            words = keyword.split()
            conditions = []
            params = []
            for w in words:
                conditions.append("cpu_model LIKE ?")
                params.append(f"%{w}%")
            sql = f"SELECT rowid, cpu_model FROM cpus WHERE {' AND '.join(conditions)} ORDER BY cpu_model LIMIT 200"
        else:
            sql = "SELECT rowid, cpu_model FROM cpus ORDER BY cpu_model LIMIT 200"
            params = []

        self.cursor.execute(sql, params)
        rows = self.cursor.fetchall()

        self.listbox.delete(0, tk.END)
        self.rowid_to_model = {}
        for rowid, model in rows:
            self.listbox.insert(tk.END, model)
            self.rowid_to_model[model] = rowid

        self.status_label.config(text=f"匹配 {len(rows)} 个 CPU（显示前200）")

    def on_select(self, event):
        selection = self.listbox.curselection()
        if not selection:
            return
        model = self.listbox.get(selection[0])
        self.current_detail_model = model
        rowid = self.rowid_to_model.get(model)
        if rowid:
            self.show_detail(rowid)
        self.update_status_label.config(text="")

    def show_detail(self, rowid):
        self.cursor.execute("SELECT * FROM cpus WHERE rowid=?", (rowid,))
        row = self.cursor.fetchone()
        if not row:
            return

        for widget in self.detail_inner.winfo_children():
            widget.destroy()

        columns = [desc[0] for desc in self.cursor.description]
        data = dict(zip(columns, row))

        for col in columns:
            if col in self.field_names:
                display_name = self.field_names[col]
                value = data.get(col)
                if value is None or (isinstance(value, str) and value.strip() == ''):
                    continue
                frame = ttk.Frame(self.detail_inner)
                frame.pack(fill='x', pady=2)
                label = ttk.Label(frame, text=f"{display_name}：", font=('Arial', 10, 'bold'), width=18, anchor='e')
                label.pack(side=tk.LEFT)

                if col in self.clickable_fields and value:
                    btn = tk.Button(frame, text=str(value), relief='flat', fg='blue', cursor='hand2',
                                    font=('Arial', 10, 'underline'),
                                    command=lambda f=col, v=value: self.filter_by_field(f, v))
                    btn.pack(side=tk.LEFT, padx=(0,5))
                else:
                    val_label = ttk.Label(frame, text=str(value), font=('Arial', 10))
                    val_label.pack(side=tk.LEFT)

        if not self.detail_inner.winfo_children():
            ttk.Label(self.detail_inner, text="该 CPU 没有详细信息").pack()

    def filter_by_field(self, field, value):
        self.search_var.set(f"{field}:{value}")
        sql = f"SELECT rowid, cpu_model FROM cpus WHERE {field} = ? ORDER BY cpu_model LIMIT 200"
        self.cursor.execute(sql, (value,))
        rows = self.cursor.fetchall()

        self.listbox.delete(0, tk.END)
        self.rowid_to_model = {}
        for rowid, model in rows:
            self.listbox.insert(tk.END, model)
            self.rowid_to_model[model] = rowid

        self.status_label.config(text=f"筛选 '{field}={value}'，共 {len(rows)} 个 CPU（显示前200）")

    # -------------------- 对比列表 --------------------
    def add_selected_to_compare(self, event=None):
        selection = self.listbox.curselection()
        if not selection:
            messagebox.showinfo("提示", "请先在左侧列表中选择一个 CPU")
            return
        model = self.listbox.get(selection[0])
        if model in self.compare_list:
            messagebox.showinfo("提示", f"'{model}' 已在对比列表中")
            return
        self.compare_list.append(model)
        self.update_compare_listbox()

    def remove_selected_from_compare(self, event=None):
        selection = self.compare_listbox.curselection()
        if not selection:
            return
        for idx in reversed(selection):
            del self.compare_list[idx]
        self.update_compare_listbox()

    def move_up(self):
        selection = self.compare_listbox.curselection()
        if not selection or selection[0] == 0:
            return
        idx = selection[0]
        self.compare_list[idx-1], self.compare_list[idx] = self.compare_list[idx], self.compare_list[idx-1]
        self.update_compare_listbox()
        self.compare_listbox.selection_set(idx-1)

    def move_down(self):
        selection = self.compare_listbox.curselection()
        if not selection or selection[0] == len(self.compare_list)-1:
            return
        idx = selection[0]
        self.compare_list[idx], self.compare_list[idx+1] = self.compare_list[idx+1], self.compare_list[idx]
        self.update_compare_listbox()
        self.compare_listbox.selection_set(idx+1)

    def clear_compare(self):
        self.compare_list.clear()
        self.update_compare_listbox()

    def update_compare_listbox(self):
        self.compare_listbox.delete(0, tk.END)
        for model in self.compare_list:
            self.compare_listbox.insert(tk.END, model)

    def compare_selected(self):
        if len(self.compare_list) < 2:
            messagebox.showinfo("提示", "对比列表中至少需要 2 个 CPU")
            return

        placeholders = ','.join(['?'] * len(self.compare_list))
        self.cursor.execute(f"SELECT * FROM cpus WHERE cpu_model IN ({placeholders})", self.compare_list)
        rows = self.cursor.fetchall()
        if len(rows) < 2:
            messagebox.showwarning("警告", "部分CPU数据不存在，请检查")
            return

        columns = [desc[0] for desc in self.cursor.description]
        cpu_data_list = [dict(zip(columns, row)) for row in rows]
        order_map = {model: idx for idx, model in enumerate(self.compare_list)}
        cpu_data_list.sort(key=lambda x: order_map.get(x['cpu_model'], 999))

        self.show_compare_window(cpu_data_list)

    def show_compare_window(self, cpu_data_list):
        compare_win = tk.Toplevel(self.root)
        compare_win.title("CPU 对比")
        compare_win.geometry("1000x600")

        tree = ttk.Treeview(compare_win, show='headings')
        tree.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        col_names = ['字段'] + [cpu['cpu_model'] for cpu in cpu_data_list]
        tree['columns'] = col_names

        for col in col_names:
            tree.heading(col, text=col, command=lambda c=col: self.tree_sort_column(tree, c, False))
            if col == '字段':
                tree.column(col, width=150, anchor='w')
            else:
                tree.column(col, width=180, anchor='w')

        for field_key, field_display in self.field_names.items():
            row_values = [field_display]
            for cpu in cpu_data_list:
                val = cpu.get(field_key)
                if val is None or (isinstance(val, str) and val.strip() == ''):
                    row_values.append('-')
                else:
                    row_values.append(str(val))
            tree.insert('', tk.END, values=row_values)

        vsb = ttk.Scrollbar(compare_win, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=vsb.set)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)

    def tree_sort_column(self, tree, col, reverse):
        data_list = [(tree.set(child, col), child) for child in tree.get_children('')]
        try:
            data_list.sort(key=lambda x: float(x[0]) if x[0].replace('.','',1).isdigit() else x[0], reverse=reverse)
        except:
            data_list.sort(key=lambda x: x[0].lower(), reverse=reverse)
        for index, (_, child) in enumerate(data_list):
            tree.move(child, '', index)
        tree.heading(col, command=lambda: self.tree_sort_column(tree, col, not reverse))

    
    # -------------------- 从英特尔官网获取数据（新版） --------------------
    def update_from_intel(self):
        if not self.current_detail_model:
            messagebox.showinfo("提示", "请先在左侧选择一个 CPU")
            return

        model = self.current_detail_model
        self.update_status_label.config(text="正在获取...", foreground="blue")
        self.root.update()

        try:
            data = self.fetch_intel_cpu_v3(model)
            if data:
                self.update_cpu_in_db(data)
                self.update_status_label.config(text="更新成功！", foreground="green")
                self.cursor.execute("SELECT rowid FROM cpus WHERE cpu_model=?", (model,))
                row = self.cursor.fetchone()
                if row:
                    self.show_detail(row[0])
            else:
                self.update_status_label.config(text="获取失败，请查看控制台日志", foreground="red")
        except Exception as e:
            self.update_status_label.config(text=f"出错: {str(e)[:30]}", foreground="red")
            messagebox.showerror("错误", f"更新失败：{e}")

    def fetch_intel_cpu_v3(self, model_name):
        """
        从英特尔新产品页面获取CPU规格（不使用被屏蔽的ARK API）
        使用 URL 模式：https://www.intel.com/content/www/us/en/products/sku/{SKU_ID}/.../specifications.html
        """
        import urllib.parse
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }

        # 第一步：搜索获取 SKU ID
        # 使用英特尔的产品搜索（非ARK）
        search_url = "https://www.intel.com/content/www/us/en/search.html"
        params = {
            'query': model_name,
            'facet': 'products'
        }
        
        sku_id = None
        try:
            resp = requests.get(search_url, params=params, headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # 查找产品链接，格式为 /content/www/us/en/products/sku/{数字}/...
            for link in soup.find_all('a', href=True):
                href = link.get('href')
                if href and '/products/sku/' in href:
                    # 提取 SKU ID
                    match = re.search(r'/sku/(\d+)/', href)
                    if match:
                        sku_id = match.group(1)
                        # 构建完整的产品名（从链接文本或href中提取）
                        product_slug = href.split('/')[-2] if href.endswith('/') else href.split('/')[-1]
                        if product_slug and not product_slug.isdigit():
                            break
            
            if not sku_id:
                # 尝试从页面中的其他元素提取
                product_links = soup.select('a[href*="/products/sku/"]')
                for link in product_links:
                    href = link.get('href')
                    match = re.search(r'/sku/(\d+)/', href)
                    if match:
                        sku_id = match.group(1)
                        break
                        
        except Exception as e:
            print(f"搜索SKU失败: {e}")
            # 如果搜索失败，尝试直接构造URL（使用型号名作为slug）
            # 但这通常不准确，仅作为备选
        
        if not sku_id:
            # 备选方案：尝试从型号名生成URL（不精确，但有时能工作）
            # 例如 "Intel Core i7-13700K Processor" -> "intel-core-i713700k-processor"
            slug = model_name.lower()
            slug = re.sub(r'[^\w\s-]', '', slug)  # 移除特殊字符
            slug = re.sub(r'[-\s]+', '-', slug)   # 空格和连字符统一为-
            slug = slug.strip('-')
            
            # 尝试直接访问（无法保证SKU正确）
            test_url = f"https://www.intel.com/content/www/us/en/products/sku/0/{slug}/specifications.html"
            print(f"尝试备选URL: {test_url}")
            # 不直接使用，因为SKU未知
        
        if not sku_id:
            print("无法找到SKU ID，请手动输入产品URL或检查网络")
            return None

        # 第二步：访问产品规格页面
        # 需要获取产品名称slug，从之前的搜索中提取
        # 这里简化处理：访问 /products/sku/{sku_id}/overview 页面，然后重定向到完整URL
        detail_url = f"https://www.intel.com/content/www/us/en/products/sku/{sku_id}/specifications.html"
        
        try:
            # 先访问overview获取完整URL（包含产品名称）
            overview_url = f"https://www.intel.com/content/www/us/en/products/sku/{sku_id}/overview"
            resp = requests.get(overview_url, headers=headers, allow_redirects=True, timeout=15)
            
            # 获取最终URL
            final_url = resp.url
            # 如果最终URL不是specifications页面，替换为specifications
            if '/overview' in final_url:
                final_url = final_url.replace('/overview', '/specifications')
            elif '/specifications' not in final_url:
                # 尝试构造
                base = final_url.rstrip('/')
                final_url = f"{base}/specifications.html"
            
            print(f"访问规格页面: {final_url}")
            resp = requests.get(final_url, headers=headers, timeout=15)
            resp.raise_for_status()
            
        except Exception as e:
            print(f"获取规格页面失败: {e}")
            return None

        # 第三步：解析页面中的规格数据
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 方法1：查找页面中的CSV数据（与用户上传的格式一致）
        # 页面中可能包含一个隐藏的div或script，其中包含规格数据
        specs = {}
        
        # 查找表格数据
        table = soup.find('table', class_=re.compile(r'spec|tech|product'))
        if table:
            rows = table.find_all('tr')
            for row in rows:
                th = row.find('th')
                td = row.find('td')
                if th and td:
                    key = th.get_text(strip=True)
                    value = td.get_text(strip=True)
                    specs[key] = value
        
        # 方法2：从JSON-LD提取
        if not specs:
            script = soup.find('script', type='application/ld+json')
            if script:
                try:
                    ld_json = json.loads(script.string)
                    if '@graph' in ld_json:
                        for item in ld_json['@graph']:
                            if item.get('@type') == 'Product':
                                for prop, val in item.items():
                                    if prop not in ('@type', '@context', '@id'):
                                        specs[prop] = str(val)
                except:
                    pass
        
        # 方法3：从页面中的dl列表提取
        if not specs:
            dls = soup.find_all('dl')
            for dl in dls:
                dt = dl.find('dt')
                dd = dl.find('dd')
                if dt and dd:
                    key = dt.get_text(strip=True)
                    value = dd.get_text(strip=True)
                    specs[key] = value
        
        # 方法4：查找规格表格（常见于产品页面）
        if not specs:
            spec_sections = soup.find_all('div', class_=re.compile(r'spec|tech'))
            for section in spec_sections:
                rows = section.find_all('tr')
                for row in rows:
                    th = row.find('th')
                    td = row.find('td')
                    if th and td:
                        key = th.get_text(strip=True)
                        value = td.get_text(strip=True)
                        specs[key] = value

        if not specs:
            print("未找到规格数据")
            return None

        # 字段映射（与之前一致）
        field_map = {
            'Processor Number': 'cpu_model',
            'Launch Date': 'release_time',
            'Lithography': 'manufacturing',
            'Processor Graphics': 'igpu',
            'Cores': 'cores',
            'Threads': 'threads',
            'Processor Base Frequency': 'base_freq',
            'Max Turbo Frequency': 'boost_freq',
            'Cache': 'cache_l3',
            'TDP': 'tdp',
            'Instruction Set': 'instruction_set',
            'Socket': 'socket',
            'Max Memory Size': 'max_memory',
            'Memory Types': 'memory_type',
            'Max # of Memory Channels': 'memory_channels',
            'ECC Memory Supported': 'ecc_support',
            'PCI Express Revision': 'pcie_version',
            'Package': 'package',
            'Die Size': 'die_size',
            'Transistors': 'transistor_count',
            'Hyper-Threading': 'hyper_threading',
            'Overclocking': 'overclocking',
            'Platform': 'platform',
            'Chipset': 'chipset',
            'Total Cores': 'cores',      # 新页面可能使用 "Total Cores"
            'Performance-core Max Turbo Frequency': 'boost_freq',
            'Efficient-core Max Turbo Frequency': 'boost_freq',
            'Performance-core Base Frequency': 'base_freq',
            'Efficient-core Base Frequency': 'base_freq',
            'Processor Base Power': 'tdp',
            'Maximum Turbo Power': 'tdp',
            'Intel® Turbo Boost Max Technology 3.0 Frequency': 'boost_freq',
        }

        result = {}
        for ark_key, db_col in field_map.items():
            if db_col is None:
                continue
            value = specs.get(ark_key)
            if not value:
                # 尝试不区分大小写匹配
                for k, v in specs.items():
                    if k.lower() == ark_key.lower():
                        value = v
                        break
            
            if value:
                value = re.sub(r'\s+', ' ', value).strip()
                # 转换
                if db_col in ('manufacturing',):
                    m = re.search(r'(\d+)\s*nm', value, re.I)
                    if m:
                        value = int(m.group(1))
                    else:
                        value = value
                elif db_col in ('cores', 'threads', 'tdp', 'cache_l3', 'memory_channels', 'max_memory'):
                    nums = re.findall(r'[\d.]+', value)
                    if nums:
                        if '.' in nums[0]:
                            value = float(nums[0])
                        else:
                            value = int(nums[0])
                    else:
                        value = None
                elif db_col in ('base_freq', 'boost_freq'):
                    m = re.search(r'([\d.]+)\s*GHz', value, re.I)
                    if m:
                        value = float(m.group(1))
                    else:
                        value = None
                elif db_col in ('ecc_support', 'hyper_threading', 'overclocking'):
                    value = 'Yes' in value or '是' in value
                # 其他保留字符串
            else:
                value = None
            result[db_col] = value

        result['cpu_model'] = model_name
        
        # 如果核心数据没解析到，尝试从 "Total Cores" 等字段提取
        if not result.get('cores'):
            for key in ['Total Cores', 'Cores']:
                if key in specs:
                    val = specs[key]
                    nums = re.findall(r'(\d+)', str(val))
                    if nums:
                        result['cores'] = int(nums[0])
                        break
        
        if not result.get('threads'):
            for key in ['Total Threads', 'Threads']:
                if key in specs:
                    val = specs[key]
                    nums = re.findall(r'(\d+)', str(val))
                    if nums:
                        result['threads'] = int(nums[0])
                        break

        return result

    def update_cpu_in_db(self, data):
        model = data['cpu_model']
        self.cursor.execute("SELECT rowid FROM cpus WHERE cpu_model=?", (model,))
        row = self.cursor.fetchone()
        if row:
            set_clause = ', '.join([f"{k}=?" for k in data.keys() if k != 'cpu_model'])
            values = [data[k] for k in data.keys() if k != 'cpu_model']
            values.append(model)
            self.cursor.execute(f"UPDATE cpus SET {set_clause} WHERE cpu_model=?", values)
        else:
            cols = ', '.join(data.keys())
            placeholders = ', '.join(['?'] * len(data))
            self.cursor.execute(f"INSERT INTO cpus ({cols}) VALUES ({placeholders})", list(data.values()))
        self.conn.commit()

    def __del__(self):
        if hasattr(self, 'conn'):
            self.conn.close()

if __name__ == '__main__':
    root = tk.Tk()
    app = CPUSearchApp(root)
    root.mainloop()