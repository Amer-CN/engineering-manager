/**
 * use-dictation.test.ts — 听写 hook 测试（Beautiful UI 第二批）
 *
 * mock：@/services/stt-client 全部导出 + getUserMedia + MediaRecorder。
 * 覆盖：录音→上传→建任务→轮询→文本回调；轮询 running→completed（1.5s 间隔）；
 * 取消清理（停流、不上传）；STT 不可用 → available=false。
 */

import { act, renderHook, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDictation } from '../useDictation'
import { createSttJob, getSttJob, getSttStatus, uploadSttAudio } from '@/services/stt-client'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

vi.mock('@/services/stt-client', () => ({
  getSttStatus: vi.fn(),
  uploadSttAudio: vi.fn(),
  createSttJob: vi.fn(),
  getSttJob: vi.fn(),
  getSttJobs: vi.fn(),
  ingestSttJob: vi.fn(),
  cancelSttJob: vi.fn(),
  retrySttJob: vi.fn(),
  deleteSttJob: vi.fn(),
}))

/** MediaRecorder 测试替身：记录实例，stop() 触发 onstop */
class MockMediaRecorder {
  static instances: MockMediaRecorder[] = []
  stream: MediaStream
  mimeType = 'audio/webm'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  constructor(stream: MediaStream) {
    this.stream = stream
    MockMediaRecorder.instances.push(this)
  }
  start() { /* started */ }
  stop() {
    this.onstop?.()
  }
}

const makeStream = (trackStop = vi.fn()) =>
  ({ getTracks: () => [{ stop: trackStop }] }) as unknown as MediaStream

const mockRecorderGlobal = () => {
  MockMediaRecorder.instances = []
  vi.stubGlobal('MediaRecorder', MockMediaRecorder)
}

const mockGetUserMedia = (trackStop = vi.fn()) => {
  const getUserMedia = vi.fn(async () => makeStream(trackStop))
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
    writable: true,
  })
  return getUserMedia
}

beforeEach(() => {
  vi.clearAllMocks()
  // 默认全链路成功
  vi.mocked(getSttStatus).mockImplementation(async () => ({ success: true, data: { canTranscribe: true } }) as any)
  vi.mocked(uploadSttAudio).mockImplementation(async () =>
    ({ success: true, data: { filePath: '/tmp/a.webm', originalName: 'a.webm', size: 1, extension: 'webm' } }) as any)
  vi.mocked(createSttJob).mockImplementation(async () => ({ success: true, data: { jobId: 42, status: 'pending' } }) as any)
  vi.mocked(getSttJob).mockImplementation(async () => ({ success: true, data: { status: 'completed', text: ' 你好，工程管家 ' } }) as any)
  mockRecorderGlobal()
  mockGetUserMedia()
})

async function startRecording(onText = vi.fn()) {
  const { result } = renderHook(() => useDictation({ onText }))
  await waitFor(() => expect(result.current.available).toBe(true))
  await act(async () => {
    result.current.toggle()
  })
  await waitFor(() => expect(result.current.recording).toBe(true))
  return { result, onText }
}

describe('useDictation', () => {
  it('STT 能力检测：canTranscribe → available=true', async () => {
    const { result } = renderHook(() => useDictation({ onText: vi.fn() }))
    await waitFor(() => expect(result.current.available).toBe(true))
  })

  it('STT 不可用 → available=false（上层隐藏麦克风按钮）', async () => {
    vi.mocked(getSttStatus).mockImplementation(async () => ({ success: false, error: 'x' }) as any)
    const { result } = renderHook(() => useDictation({ onText: vi.fn() }))
    await waitFor(() => expect(result.current.available).toBe(false))
  })

  it('录音 → 停止 → 上传 → 建任务 → 轮询 completed → text 回调（trim）', async () => {
    const { result, onText } = await startRecording()
    const rec = MockMediaRecorder.instances[0]
    // 模拟录音数据
    act(() => {
      rec.ondataavailable?.({ data: new Blob(['audio-bytes']) })
    })
    // 停止 → onstop 产出文件 → 转写
    await act(async () => {
      result.current.toggle()
    })

    await waitFor(() => expect(onText).toHaveBeenCalledWith('你好，工程管家'))
    expect(uploadSttAudio).toHaveBeenCalledTimes(1)
    expect(createSttJob).toHaveBeenCalledWith({ filePath: '/tmp/a.webm', isMultiSpeaker: false })
    expect(getSttJob).toHaveBeenCalledWith(42)
    await waitFor(() => expect(result.current.phase).toBe('idle'))
  })

  it('轮询：running → 1.5s 后再查 → completed 回调文本', async () => {
    vi.mocked(getSttJob)
      .mockResolvedValueOnce({ success: true, data: { status: 'running', progress: 30 } } as any)
      .mockResolvedValueOnce({ success: true, data: { status: 'completed', text: '轮询结果' } } as any)

    const { result, onText } = await startRecording()
    act(() => {
      MockMediaRecorder.instances[0].ondataavailable?.({ data: new Blob(['x']) })
    })
    await act(async () => {
      result.current.toggle()
    })

    // 第一次查询 running → 不回调；等待 1.5s 轮询间隔后的第二次查询
    await waitFor(() => expect(onText).toHaveBeenCalledWith('轮询结果'), { timeout: 4000 })
    expect(getSttJob).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(result.current.phase).toBe('idle'))
  }, 10_000)

  it('取消：清理录音流（track.stop），不进入上传', async () => {
    const trackStop = vi.fn()
    mockGetUserMedia(trackStop)
    const { result, onText } = await startRecording()
    act(() => {
      result.current.cancel()
    })
    expect(result.current.phase).toBe('idle')
    expect(trackStop).toHaveBeenCalled()
    // onstop 被 cleanup 触发，但会话已作废 → 不上传
    expect(uploadSttAudio).not.toHaveBeenCalled()
    expect(onText).not.toHaveBeenCalled()
  })

  it('卸载：清理流与定时器（无异常抛出）', async () => {
    const trackStop = vi.fn()
    mockGetUserMedia(trackStop)
    const { result, unmount } = renderHook(() => useDictation({ onText: vi.fn() }))
    await waitFor(() => expect(result.current.available).toBe(true))
    await act(async () => {
      result.current.toggle()
    })
    await waitFor(() => expect(result.current.recording).toBe(true))
    expect(() => unmount()).not.toThrow()
    expect(trackStop).toHaveBeenCalled()
  })
})
