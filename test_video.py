import requests, json, time, os

API_KEY = "sk-ZqhVc4y6UxPwKLCr7CRgbuwOlyLMIOU1qoC6pfLtkB0gr1c9"
BASE = "https://apihub.agnes-ai.com"
proxies = {"http": None, "https": None}

print("========================================")
print("  Agnes Video V2.0 - API Test")
print("========================================")
print()
print("[Step 1] 创建视频任务...")

headers = {"Authorization": "Bearer " + API_KEY, "Content-Type": "application/json"}
payload = {
    "model": "agnes-video-v2.0",
    "prompt": "A cinematic drone shot flying over a crystal-clear alpine lake at sunrise, mist rising from water, snow mountains, golden hour lighting, slow motion",
    "height": 768,
    "width": 1152,
    "num_frames": 81,
    "frame_rate": 24
}

try:
    resp = requests.post(BASE + "/v1/videos", json=payload, headers=headers, timeout=120, proxies=proxies)
    print("HTTP " + str(resp.status_code))
    data = resp.json()
    print(json.dumps(data, indent=2))
    
    video_id = data.get("video_id")
    task_id = data.get("task_id")
    status = data.get("status")
    
    if video_id:
        print()
        print("video_id=" + video_id)
        print("task_id=" + task_id)
        print("status=" + status)
        print()
        print("[Step 2] 轮询查询结果 (间隔5秒)...")
        
        for i in range(1, 61):
            time.sleep(5)
            try:
                qresp = requests.get(BASE + "/agnesapi", params={"video_id": video_id}, headers=headers, timeout=30, proxies=proxies)
                rdata = qresp.json()
                s = rdata.get("status", "?")
                p = rdata.get("progress", "?")
                print("  [轮询 #" + str(i) + "] status=" + str(s) + "  progress=" + str(p) + "%")
                
                if s == "completed":
                    print()
                    print("  视频生成完成！")
                    url = rdata.get("remixed_from_video_id")
                    print("  视频URL: " + str(url))
                    break
                elif s == "failed":
                    err = rdata.get("error")
                    print("  生成失败: " + str(err))
                    break
            except Exception as e:
                print("  [轮 #" + str(i) + "] 查询出错: " + str(e))
    else:
        print("请求失败，未返回 video_id")
        
except requests.exceptions.Timeout:
    print("请求超时")
except Exception as e:
    print("错误: " + str(e))

print()
print("========================================")
print("  测试完成")
print("========================================")
