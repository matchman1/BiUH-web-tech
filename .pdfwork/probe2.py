import re, zlib, sys

path = sys.argv[1]
data = open(path, "rb").read()
print("文件:", path)
print("大小:", len(data), "字节")
print("头部:", data[:16])

print("间接对象数:", len(re.findall(rb"(\d+)\s+(\d+)\s+obj", data)))
counts = re.findall(rb"/Type\s*/Pages[^>]*?/Count\s+(\d+)", data, re.S)
print("/Type /Pages /Count:", counts[:10])
print("/Type /Page 出现次数:", len(re.findall(rb"/Type\s*/Page[^s]", data)))

subtypes = sorted({s.decode() for s in re.findall(rb"/Subtype\s*/(\w+)", data)})
print("Subtype:", subtypes)

print("含 /ToUnicode:", len(re.findall(rb"/ToUnicode", data)))
print("含 /FontFile:", len(re.findall(rb"/FontFile", data)))
print("含 /Image:", len(re.findall(rb"/Subtype\s*/Image", data)))
print("含 /DCTDecode:", len(re.findall(rb"/DCTDecode", data)))
print("含 /FlateDecode:", len(re.findall(rb"/FlateDecode", data)))
print("含 /Encrypt:", len(re.findall(rb"/Encrypt", data)))

ok = 0
total = 0
samples = []
for m in re.finditer(rb"stream\r?\n", data):
    start = m.end()
    end = data.find(b"endstream", start)
    if end == -1:
        continue
    try:
        dec = zlib.decompress(data[start:end])
        ok += 1
        total += len(dec)
        if len(samples) < 2:
            samples.append(dec[:400])
    except Exception:
        pass
print("可 zlib 解压的流:", ok, "解压后总字节:", total)

# 判断内容流里是文字还是矢量图形
joined = b""
for m in re.finditer(rb"stream\r?\n", data):
    start = m.end()
    end = data.find(b"endstream", start)
    if end == -1:
        continue
    try:
        joined += zlib.decompress(data[start:end])
    except Exception:
        pass
print("Tj 算子:", len(re.findall(rb"\bTj\b", joined)))
print("TJ 算子:", len(re.findall(rb"\bTJ\b", joined)))
print("BT 块:", len(re.findall(rb"\bBT\b", joined)))
print("路径绘制 (m/l/c) 操作数:", len(re.findall(rb"\s(m|l|c)\s", joined)))
print("Tf (设置字体) 次数:", len(re.findall(rb"\bTf\b", joined)))
for i, s in enumerate(samples):
    print(f"--- 样本 {i+1} ---")
    print(s[:400])
