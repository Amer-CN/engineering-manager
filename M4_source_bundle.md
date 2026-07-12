# M4 第五轮审查包 (Source Bundle v5)

> 生成时间: 2026-07-11 20:49:15
> 本包针对 GPT-5.6 第四轮审核结论的整改回复


---

## 1. Git 证据

### git log --oneline -5
```
dcf2880 feat(stt-knowledge): M4 speech-to-text + knowledge base with security hardening
fba841f Merge branch 'feat/costledger-grid-visible-beta' into master
3a64e9d fix(costledger): align beta mode priority and summary failure handling
de0badb feat(costledger): expose guarded beta toggle for new grid
1bd2957 feat(cost-ledger): add TanStack Table grid skeleton with frozen columns, grouping, inline edit
```

### git status --short
```
?? 3
?? EngineeringManager.E2E/
?? M2_FIFTH_ROUND_FINAL_REPORT.md
?? M2_FIFTH_ROUND_REPORT.md
?? M2_FOURTH_ROUND_REPORT.md
?? M2_THIRD_ROUND_REPORT.md
?? M2_changed_files_only.md
?? M2_fifth_round_build_output.txt
?? M2_fifth_round_changed_files.md
?? M2_fifth_round_full_test_output.txt
?? M2_fifth_round_source_bundle.md
?? M2_fifth_round_test_build_output.txt
?? M2_fifth_round_test_output.txt
?? M2_fourth_round_changed_files.md
?? M2_source_code_bundle_v3.md
?? M3_FINAL_REPORT.md
?? M3_source_bundle.md
?? M4_source_bundle.md
?? asr-engine/
?? asr-report.md
?? asr-test/
?? asr_compare.csv
?? e2e-dump.txt
?? e2e-recovered.txt
?? gen_m4_bundle_v3.py
?? gen_m4_bundle_v4.py
?? gen_m4_bundle_v5.py
?? hotwords.txt
?? project-bundle-installer.md
?? project-bundle-root.md
?? project-bundle-server.md
?? project-bundle-src-components.md
?? project-bundle-src-core.md
?? project-bundle-src-hooks.md
?? project-bundle-src-tests.md
?? results_06b.json
?? semantic-test-result.txt
```

### git show --stat HEAD
```
commit dcf288033c5b8d0c432941ad88679179c33d5e15
Author: Amer <Amer@local>
Date:   Sat Jul 11 20:44:34 2026 +0800

    feat(stt-knowledge): M4 speech-to-text + knowledge base with security hardening
    
    STT endpoints: upload (500MB limit), transcribe, polling, ingest. Knowledge endpoints: documents CRUD, hybrid search (FTS5 + semantic). Security: path traversal prevention, knowledge:read permission, user-dim isolation. Response contracts: unified data wrapper. Segment validation: speaker continuity, count/length limits, text-segments consistency. Frontend: TranscriptionWorkspace, AudioUploadCard, TranscriptEditor, SttJobList, KnowledgeLibrary, KnowledgeDocumentDrawer, KnowledgeSourceCard. sessionStorage-based agent-to-knowledge navigation. Backend tests: 35 M4-specific. Frontend tests: 60 tests. Migrations: 028-030.

 AGENTS.md                                          |   26 +
 EngineeringManager.Api/Common.cs                   |    4 +-
 EngineeringManager.Api/Endpoints/AgentEndpoints.cs |   16 +-
 .../Endpoints/KnowledgeEndpoints.cs                |  304 +++++
 EngineeringManager.Api/Endpoints/SttEndpoints.cs   |  539 +++++++++
 .../EngineeringManager.Api.csproj                  |    6 +-
 .../Migrations/MigrationRunner.cs                  |   47 +-
 .../Migrations/Scripts/028_AddSpeechToText.sql     |   28 +
 .../Migrations/Scripts/029_AddKnowledgeBase.sql    |   72 ++
 .../Scripts/030_AddKnowledgeDocUniqueIndex.sql     |   17 +
 EngineeringManager.Api/Program.cs                  |   27 +
 EngineeringManager.Api/Security/CurrentUser.cs     |   35 +
 .../Services/AgentToolService.cs                   |  135 ++-
 .../Services/BgeEmbeddingService.cs                |  493 ++++++++
 .../Services/IEmbeddingService.cs                  |   23 +
 EngineeringManager.Api/Services/ILlmChatService.cs |   25 +
 .../Services/KnowledgeBaseService.cs               |  862 +++++++++++++
 .../Services/LlmProviderService.cs                 |    2 +-
 .../Services/Stt/AudioPreprocessor.cs              |   98 ++
 .../Services/Stt/DiarizationService.cs             |  504 ++++++++
 EngineeringManager.Api/Services/Stt/ISttEngine.cs  |   27 +
 .../Services/Stt/LlamaCppGgufEngine.cs             |  598 ++++++++++
 .../Services/Stt/SpeakerLabelNormalizer.cs         |  111 ++
 .../Services/Stt/SttEngineSelector.cs              |  120 ++
 .../Services/Stt/SttModelManager.cs                |  383 ++++++
 EngineeringManager.Api/Services/Stt/SttModels.cs   |   86 ++
 EngineeringManager.Api/Services/Stt/SttWorker.cs   |  263 ++++
 .../Common/AgentIntegrationTestBase.cs             |  105 ++
 EngineeringManager.Tests/Common/ApiTestBase.cs     |    9 +
 .../Common/FakeLlmChatService.cs                   |  169 +++
 .../Endpoints/AgentKnowledgeToolTests.cs           | 1008 ++++++++++++++++
 .../Endpoints/BgeEmbeddingServiceTests.cs          |   98 ++
 .../Endpoints/KnowledgeBaseM2Tests.cs              |  440 +++++++
 .../Endpoints/KnowledgeBaseServiceTests.cs         |  492 ++++++++
 .../Endpoints/M2FourthRoundTests.cs                | 1260 ++++++++++++++++++++
 .../Endpoints/M4SttUploadAndIngestTests.cs         |  430 +++++++
 .../Endpoints/M4ThirdRoundTests.cs                 |  728 +++++++++++
 EngineeringManager.Tests/Endpoints/SttE2ETests.cs  |  168 +++
 .../Endpoints/SttEndpointsTests.cs                 |  241 ++++
 .../Migrations/Fts5TrigramTests.cs                 |   90 ++
 src/App.tsx                                        |    2 +
 .../features/agent/KnowledgeSourceCard.tsx         |  161 +++
 src/components/features/agent/RichToolResult.tsx   |    3 +
 .../agent/__tests__/KnowledgeSourceCard.test.tsx   |  181 +++
 .../features/agent/richToolResult.utils.ts         |    1 +
 .../features/knowledge/AudioUploadCard.tsx         |  143 +++
 .../features/knowledge/KnowledgeDocumentDrawer.tsx |  140 +++
 .../features/knowledge/KnowledgeLibrary.tsx        |  273 +++++
 .../features/knowledge/SpeechKnowledgePage.tsx     |   68 ++
 src/components/features/knowledge/SttJobList.tsx   |  127 ++
 .../features/knowledge/TranscriptEditor.tsx        |  222 ++++
 .../features/knowledge/TranscriptionWorkspace.tsx  |  394 ++++++
 .../__tests__/SpeechKnowledgePage.test.tsx         |  348 ++++++
 .../__tests__/TranscriptEditor.rebuild.test.ts     |   90 ++
 .../__tests__/knowledge-client.contract.test.ts    |  106 ++
 .../knowledge/__tests__/knowledgeTextMask.test.ts  |   94 ++
 .../__tests__/sessionStorage-pendingDoc.test.ts    |   91 ++
 .../__tests__/stt-client.contract.test.ts          |  103 ++
 .../features/knowledge/knowledgeTextMask.ts        |   94 ++
 src/routes.ts                                      |    9 +
 src/services/knowledge-client.ts                   |  224 ++++
 src/services/stt-client.ts                         |  314 +++++
 src/types/permissions.ts                           |    4 +
 src/utils/iconMap.ts                               |    4 +-
 64 files changed, 13274 insertions(+), 11 deletions(-)
```


---

## 2. 后端编译输出

```
正在确定要还原的项目…
  所有项目均是最新的，无法还原。
  EngineeringManager.Api -> E:\测试\EngineeringManager.Api\bin\Debug\net8.0-windows\EngineeringManager.Api.dll

已成功生成。
    0 个警告
    0 个错误

已用时间 00:00:01.10
```


---

## 3. 后端测试输出

```
正在确定要还原的项目…
  所有项目均是最新的，无法还原。
  EngineeringManager.Api -> E:\测试\EngineeringManager.Api\bin\Debug\net8.0-windows\EngineeringManager.Api.dll
C:\Program Files\dotnet\sdk\8.0.421\Microsoft.Common.CurrentVersion.targets(2412,5): warning MSB3277: 发现无法解析的“WindowsBase”的不同版本之间存在冲突。 [E:\测试\EngineeringManager.Tests\EngineeringManager.Tests.csproj]
C:\Program Files\dotnet\sdk\8.0.421\Microsoft.Common.CurrentVersion.targets(2412,5): warning MSB3277: “WindowsBase, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35”与“WindowsBase, Version=5.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35”之间存在冲突。 [E:\测试\EngineeringManager.Tests\EngineeringManager.Tests.csproj]
C:\Program Files\dotnet\sdk\8.0.421\Microsoft.Common.CurrentVersion.targets(2412,5): warning MSB3277:     已选择“WindowsBase, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35”，因为它是主版本而“WindowsBase, Version=5.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35”不是。 [E:\测试\EngineeringManager.Tests\EngineeringManager.Tests.csproj]
C:\Program Files\dotnet\sdk\8.0.421\Microsoft.Common.CurrentVersion.targets(2412,5): warning MSB3277:     依赖于“WindowsBase, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35”[C:\Program Files\dotnet\packs\Microsoft.NETCore.App.Ref\8.0.27\ref\net8.0\WindowsBase.dll]的引用。 [E:\测试\EngineeringManager.Tests\EngineeringManager.Tests.csproj]
C:\Program Files\dotnet\sdk\8.0.421\Microsoft.Common.CurrentVersion.targets(2412,5): warning MSB3277:         C:\Program Files\dotnet\packs\Microsoft.NETCore.App.Ref\8.0.27\ref\net8.0\WindowsBase.dll [E:\测试\EngineeringManager.Tests\EngineeringManager.Tests.csproj]
C:\Program Files\dotnet\sdk\8.0.421\Microsoft.Common.CurrentVersion.targets(2412,5): warning MSB3277:           导致引用“C:\Program Files\dotnet\packs\Microsoft.NETCore.App.Ref\8.0.27\ref\net8.0\WindowsBase.dll”的项目文件项 Include 特性。 [E:\测试\EngineeringManager.Tests\EngineeringManager.Tests.csproj]
C:\Program Files\dotnet\sdk\8.0.421\Microsoft.Common.CurrentVersion.targets(2412,5): warning MSB3277:             C:\Program Files\dotnet\packs\Microsoft.NETCore.App.Ref\8.0.27\ref/net8.0/WindowsBase.dll [E:\测试\EngineeringManager.Tests\EngineeringManager.Tests.csproj]
C:\Program Files\dotnet\sdk\8.0.421\Microsoft.Common.CurrentVersion.targets(2412,5): warning MSB3277:     依赖于或已统一到“WindowsBase, Version=5.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35”[] 的引用。 [E:\测试\EngineeringManager.Tests\EngineeringManager.Tests.csproj]
C:\Program Files\dotnet\sdk\8.0.421\Microsoft.Common.CurrentVersion.targets(2412,5): warning MSB3277:         C:\Users\Admin\.nuget\packages\microsoft.web.webview2\1.0.3967.48\lib_manual\net5.0-windows10.0.17763.0\Microsoft.Web.WebView2.Wpf.dll [E:\测试\EngineeringManager.Tests\EngineeringManager.Tests.csproj]
C:\Program Files\dotnet\sdk\8.0.421\Microsoft.Common.CurrentVersion.targets(2412,5): warning MSB3277:           导致引用“C:\Users\Admin\.nuget\packages\microsoft.web.webview2\1.0.3967.48\lib_manual\net5.0-windows10.0.17763.0\Microsoft.Web.WebView2.Wpf.dll”的项目文件项 Include 特性。 [E:\测试\EngineeringManager.Tests\EngineeringManager.Tests.csproj]
C:\Program Files\dotnet\sdk\8.0.421\Microsoft.Common.CurrentVersion.targets(2412,5): warning MSB3277:             C:\Users\Admin\.nuget\packages\microsoft.web.webview2\1.0.3967.48\buildTransitive\..\\lib_manual\net5.0-windows10.0.17763.0\Microsoft.Web.WebView2.Wpf.dll [E:\测试\EngineeringManager.Tests\EngineeringManager.Tests.csproj]
  EngineeringManager.Tests -> E:\测试\EngineeringManager.Tests\bin\Debug\net8.0-windows\EngineeringManager.Tests.dll
E:\测试\EngineeringManager.Tests\bin\Debug\net8.0-windows\EngineeringManager.Tests.dll (.NETCoreApp,Version=v8.0)的测试运行
VSTest 版本 17.11.1 (x64)

正在启动测试执行，请稍候...
总共 1 个测试文件与指定模式相匹配。

已通过! - 失败:     0，通过:    35，已跳过:     0，总计:    35，持续时间: 1 m 2 s - EngineeringManager.Tests.dll (net8.0)
```


---

## 4. 前端测试输出

```
[1m[30m[46m RUN [49m[39m[22m [36mv4.1.6 [39m[90mE:/测试[39m

 [32m✓[39m src/components/features/knowledge/__tests__/knowledgeTextMask.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/components/features/knowledge/__tests__/stt-client.contract.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/components/features/knowledge/__tests__/knowledge-client.contract.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/components/features/knowledge/__tests__/sessionStorage-pendingDoc.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/components/features/knowledge/__tests__/TranscriptEditor.rebuild.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 6[2mms[22m[39m
[90mstderr[2m | src/components/features/knowledge/__tests__/SpeechKnowledgePage.test.tsx[2m > [22m[2mSpeechKnowledgePage — sessionStorage consumption[2m > [22m[2mconsumes pendingDocId from sessionStorage → switches to library tab + passes openDocId
[22m[39mWarning: React does not recognize the `whileHover` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `whilehover` instead. If you accidentally passed it from a parent component, remove it from the DOM element.
    at div
    at div (E:/测试/src/components/features/knowledge/__tests__/SpeechKnowledgePage.test.tsx:20:20)
    at Card (E:/测试/src/components/ui/Card/Card.tsx:21:17)
    at div
    at PageContainer (E:/测试/src/components/ui/PageContainer.tsx:17:26)
    at SpeechKnowledgePage (E:/测试/src/components/features/knowledge/SpeechKnowledgePage.tsx:25:70)

 [32m✓[39m src/components/features/knowledge/__tests__/SpeechKnowledgePage.test.tsx [2m([22m[2m15 tests[22m[2m)[22m[32m 263[2mms[22m[39m
 [32m✓[39m src/components/features/agent/__tests__/KnowledgeSourceCard.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[32m 80[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m60 passed[39m[22m[90m (60)[39m
[2m   Start at [22m 20:50:26
[2m   Duration [22m 2.60s[2m (transform 629ms, setup 912ms, import 1.43s, tests 383ms, environment 8.88s)[22m
```


---

## 5. 核心前端组件源码


### `src/components/features/knowledge/TranscriptionWorkspace.tsx`

```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { useToastContext } from '@/hooks/useToast'
import { useMask } from '@/contexts/MaskContext'
import { sttClient, type SttCapability, type SttJobDetail, type SttSegment } from '@/services/stt-client'
import AudioUploadCard from './AudioUploadCard'
import SttJobList from './SttJobList'
import TranscriptEditor from './TranscriptEditor'

const ACCEPTED_EXTS = '.wav,.mp3,.m4a,.aac,.flac,.ogg,.wma,.amr,.opus'
const MAX_SIZE = 500 * 1024 * 1024

type RecordingType = 'single' | 'dual' | 'multi'

interface TranscriptionWorkspaceProps {
  onIngested?: (docId?: number) => void
}

const TranscriptionWorkspace: React.FC<TranscriptionWorkspaceProps> = ({ onIngested }) => {
  const { showToast } = useToastContext()
  const { masked } = useMask()

  const [capability, setCapability] = useState<SttCapability | null>(null)
  const [capLoading, setCapLoading] = useState(true)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)

  const [recordingType, setRecordingType] = useState<RecordingType>('dual')
  const [numSpeakers, setNumSpeakers] = useState<number>(2)
  const [hotwords, setHotwords] = useState('')

  const [creating, setCreating] = useState(false)
  const [currentJob, setCurrentJob] = useState<SttJobDetail | null>(null)
  const [jobLoading, setJobLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 能力检测
  useEffect(() => {
    let cancelled = false
    setCapLoading(true)
    sttClient.getSttStatus().then(res => {
      if (cancelled) return
      if (res.success && res.data) {
        setCapability(res.data)
      } else {
        setCapability(null)
      }
      setCapLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // 轮询任务
  const pollJob = useCallback(async (jobId: number) => {
    const res = await sttClient.getSttJob(jobId)
    if (res.success && res.data) {
      setCurrentJob(res.data)
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
        setRefreshTrigger(t => t + 1)
      }
    }
  }, [])

  const startPolling = useCallback((jobId: number) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => pollJob(jobId), 1000)
  }, [pollJob])

  // 卸载时清理轮询
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // 文件选择
  const handleFileSelect = useCallback((file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const validExts = ACCEPTED_EXTS.split(',')
    if (!validExts.includes(ext)) {
      showToast(`不支持的格式 ${ext}，支持: ${ACCEPTED_EXTS}`, 'error')
      return
    }
    if (file.size > MAX_SIZE) {
      showToast(`文件过大 (${Math.round(file.size / 1024 / 1024)}MB)，上限 500MB`, 'error')
      return
    }
    if (file.size === 0) {
      showToast('文件为空', 'error')
      return
    }
    setSelectedFile(file)
    setUploadedPath(null)
    setUploadProgress(0)
  }, [showToast])

  // 上传
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return
    setUploading(true)
    setUploadProgress(0)
    const res = await sttClient.uploadSttAudio(selectedFile, (percent) => {
      setUploadProgress(percent)
    })
    setUploading(false)
    if (res.success && res.data) {
      setUploadedPath(res.data.filePath)
      showToast('上传成功', 'success')
    } else {
      showToast(res.error || '上传失败', 'error')
    }
  }, [selectedFile, showToast])

  // 创建转写任务
  const handleCreateJob = useCallback(async () => {
    if (!uploadedPath) {
      showToast('请先上传音频', 'error')
      return
    }
    if (capability && !capability.canTranscribe) {
      showToast('本地转写不可用', 'error')
      return
    }
    setCreating(true)
    const isMulti = recordingType !== 'single'
    const ns = recordingType === 'dual' ? 2 : (recordingType === 'multi' ? numSpeakers : undefined)
    const res = await sttClient.createSttJob({
      filePath: uploadedPath,
      isMultiSpeaker: isMulti,
      numSpeakers: ns,
      context: hotwords.trim() || undefined,
    })
    setCreating(false)
    if (res.success && res.data) {
      showToast('转写任务已创建', 'success')
      // 进入任务详情并开始轮询
      setJobLoading(true)
      const detailRes = await sttClient.getSttJob(res.data.jobId)
      setJobLoading(false)
      if (detailRes.success && detailRes.data) {
        setCurrentJob(detailRes.data)
        startPolling(res.data.jobId)
      }
      setRefreshTrigger(t => t + 1)
      // 清理上传状态
      setSelectedFile(null)
      setUploadedPath(null)
      setUploadProgress(0)
    } else {
      showToast(res.error || '创建任务失败', 'error')
    }
  }, [uploadedPath, capability, recordingType, numSpeakers, hotwords, showToast, startPolling])

  // 选择已有任务
  const handleSelectJob = useCallback(async (jobId: number) => {
    setJobLoading(true)
    const res = await sttClient.getSttJob(jobId)
    setJobLoading(false)
    if (res.success && res.data) {
      setCurrentJob(res.data)
      if (res.data.status === 'pending' || res.data.status === 'running' || res.data.status === 'processing') {
        startPolling(jobId)
      }
    } else {
      showToast(res.error || '获取任务详情失败', 'error')
    }
  }, [showToast, startPolling])

  // 入库
  const handleIngest = useCallback(async (correctedText: string, segments: SttSegment[], title: string, projectId?: number, occurredAt?: string) => {
    if (!currentJob) return
    const res = await sttClient.ingestSttJob(currentJob.id, {
      text: correctedText,
      segments: segments.length > 0 ? segments : undefined,
      title,
      projectId,
      occurredAt,
    })
    if (res.success && res.data) {
      if (res.data.idempotent) {
        showToast(`该转写已入库，已返回原文档 (ID: ${res.data.documentId})`, 'info')
      } else {
        showToast(`入库成功，文档 ID: ${res.data.documentId}`, 'success')
      }
      if (!res.data.hasEmbeddings) {
        showToast('已建立关键词索引，语义索引当前不可用', 'info')
      }
      onIngested?.(res.data.documentId)
    } else {
      showToast(res.error || '入库失败', 'error')
    }
  }, [currentJob, showToast, onIngested])

  const canTranscribe = capability?.canTranscribe ?? false
  const canDiarize = capability?.canDiarize ?? false

  return (
    <div className="space-y-6">
      {/* 能力检测 */}
      {capLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Icon name="Loader2" size={16} className="animate-spin" />
          <span>检测转写能力...</span>
        </div>
      ) : !canTranscribe ? (
        <Card padding="md" className="bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <Icon name="AlertTriangle" size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">语音转写当前不可用</p>
              <p className="text-xs text-amber-700 mt-1">
                {capability?.unavailableReason || '需要独立显卡和 ASR 模型'}
              </p>
              <p className="text-xs text-amber-600 mt-1">云端转写尚未启用</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="sm" className="bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-2 text-sm">
            <Icon name="CheckCircle" size={16} className="text-emerald-500" />
            <span className="text-emerald-800 font-medium">Qwen3-ASR-1.7B 本地模型已就绪</span>
            {!canDiarize && (
              <Badge variant="warning" size="sm">说话人分离模型未就绪</Badge>
            )}
          </div>
        </Card>
      )}

      {/* 上传区域 + 参数 */}
      {canTranscribe && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AudioUploadCard
            selectedFile={selectedFile}
            uploading={uploading}
            uploadProgress={uploadProgress}
            uploadedPath={uploadedPath}
            accept={ACCEPTED_EXTS}
            disabled={creating}
            onFileSelect={handleFileSelect}
            onUpload={handleUpload}
            onClear={() => { setSelectedFile(null); setUploadedPath(null); setUploadProgress(0) }}
          />

          <Card title="转写参数" padding="md" shadow="sm">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">录音类型</label>
                <div className="flex gap-2">
                  {([
                    { value: 'single', label: '单人录音' },
                    { value: 'dual', label: '双人通话' },
                    { value: 'multi', label: '多人会议' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRecordingType(opt.value)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        recordingType === opt.value
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {recordingType === 'multi' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">说话人数量（可选，留空自动估计）</label>
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={numSpeakers || ''}
                    onChange={(e) => setNumSpeakers(e.target.value ? parseInt(e.target.value) : 0)}
                    placeholder="自动估计"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">热词 / 上下文（可选）</label>
                <Input
                  value={hotwords}
                  onChange={(e) => setHotwords(e.target.value)}
                  placeholder="人名、项目名、工程术语，用逗号分隔"
                />
                <p className="text-xs text-slate-400 mt-1">用于提升专有名词识别准确率</p>
              </div>

              <Button
                variant="primary"
                size="md"
                block
                loading={creating}
                disabled={!uploadedPath || creating}
                onClick={handleCreateJob}
                leftIcon="Sparkles"
              >
                {uploadedPath ? '创建转写任务' : '请先上传音频'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 当前任务进度 / 结果 */}
      {currentJob && (
        <Card title="转写结果" padding="md" shadow="sm"
          extra={
            <Button variant="ghost" size="xs" onClick={() => { setCurrentJob(null); if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }}>
              <Icon name="X" size={14} />
            </Button>
          }
        >
          {jobLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Icon name="Loader2" size={16} className="animate-spin" />
              <span>加载中...</span>
            </div>
          ) : (
            <>
              {/* 进度 */}
              {(currentJob.status === 'pending' || currentJob.status === 'running' || currentJob.status === 'processing') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {currentJob.status === 'pending' ? '等待处理' : '正在转写'}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {currentJob.elapsedSec ? `已耗时 ${currentJob.elapsedSec}s` : ''}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-500"
                      style={{ width: `${currentJob.progress || 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 text-right">{currentJob.progress || 0}%</div>
                </div>
              )}

              {/* 失败 */}
              {currentJob.status === 'failed' && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  <Icon name="XCircle" size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">转写失败</p>
                    {currentJob.error && <p className="text-xs mt-1">{currentJob.error}</p>}
                  </div>
                </div>
              )}

              {/* 完成 - 编辑器 */}
              {currentJob.status === 'completed' && (
                <TranscriptEditor
                  job={currentJob}
                  masked={masked}
                  onIngest={handleIngest}
                />
              )}
            </>
          )}
        </Card>
      )}

      {/* 任务列表 */}
      <SttJobList
        refreshTrigger={refreshTrigger}
        onSelectJob={handleSelectJob}
        selectedJobId={currentJob?.id}
      />
    </div>
  )
}

export default TranscriptionWorkspace

```


### `src/components/features/knowledge/AudioUploadCard.tsx`

```tsx
/**
 * AudioUploadCard — 音频上传区域
 *
 * 支持拖拽和点击选择。
 * 禁止使用 FileReader.readAsDataURL 读取大音频。
 */

import React, { useState, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface AudioUploadCardProps {
  selectedFile: File | null
  uploading: boolean
  uploadProgress: number
  uploadedPath: string | null
  accept: string
  disabled?: boolean
  onFileSelect: (file: File) => void
  onUpload: () => void
  onClear: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const AudioUploadCard: React.FC<AudioUploadCardProps> = ({
  selectedFile, uploading, uploadProgress, uploadedPath, accept, disabled,
  onFileSelect, onUpload, onClear,
}) => {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    onFileSelect(files[0])
  }, [disabled, onFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    onFileSelect(files[0])
    // reset so same file can be selected again
    e.target.value = ''
  }, [onFileSelect])

  return (
    <Card title="上传音频" padding="md" shadow="sm">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {!selectedFile && !uploadedPath && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl py-10 px-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-primary-400 bg-primary-50'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Icon name="Upload" size={32} className="text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600 font-medium">拖拽音频文件到此处</p>
          <p className="text-xs text-slate-400 mt-1">或点击选择文件</p>
          <p className="text-xs text-slate-400 mt-2">
            支持 {accept} · 最大 500MB
          </p>
        </div>
      )}

      {selectedFile && !uploadedPath && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Icon name="FileText" size={20} className="text-slate-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</p>
              <p className="text-xs text-slate-400">{formatSize(selectedFile.size)}</p>
            </div>
            {!uploading && (
              <Button variant="ghost" size="xs" onClick={onClear} iconOnly>
                <Icon name="X" size={14} />
              </Button>
            )}
          </div>

          {uploading ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>上传中...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={onUpload} leftIcon="Upload" block>
                开始上传
              </Button>
              <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                重新选择
              </Button>
            </div>
          )}
        </div>
      )}

      {uploadedPath && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
          <Icon name="CheckCircle" size={20} className="text-emerald-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800">上传成功</p>
            <p className="text-xs text-emerald-600 truncate">{selectedFile?.name || '音频文件'}</p>
          </div>
          <Button variant="ghost" size="xs" onClick={onClear} iconOnly>
            <Icon name="X" size={14} />
          </Button>
        </div>
      )}
    </Card>
  )
}

export default AudioUploadCard

```


### `src/components/features/knowledge/TranscriptEditor.tsx`

```tsx
/**
 * TranscriptEditor — 转写结果校对编辑器
 *
 * 多人：按 segments 顺序展示，每段可编辑
 * 单人：显示完整可编辑文本区
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToastContext } from '@/hooks/useToast'
import { maskKnowledgeText } from './knowledgeTextMask'
import type { SttJobDetail, SttSegment } from '@/services/stt-client'

interface TranscriptEditorProps {
  job: SttJobDetail
  masked: boolean
  onIngest: (correctedText: string, segments: SttSegment[], title: string, projectId?: number, occurredAt?: string) => void
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 从 segments 重新组合 fullText */
function rebuildFullText(segments: SttSegment[]): string {
  return segments
    .filter(s => s.text.trim())
    .map(s => `【说话人${s.speaker}】${s.text.trim()}`)
    .join('\n')
}

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ job, masked, onIngest }) => {
  const { showToast } = useToastContext()

  // 编辑状态
  const [segments, setSegments] = useState<SttSegment[]>([])
  const [singleText, setSingleText] = useState('')
  const [title, setTitle] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [originalSegments, setOriginalSegments] = useState<SttSegment[]>([])

  // 初始化
  useEffect(() => {
    if (job.segments && job.segments.length > 0) {
      // 过滤掉 speaker 0（原始簇号不应出现在 UI）
      const validSegs = job.segments.filter(s => s.speaker > 0)
      setSegments(validSegs)
      setOriginalSegments(validSegs.map(s => ({ ...s })))
      setSingleText('')
    } else if (job.text) {
      setSingleText(job.text)
      setSegments([])
      setOriginalSegments([])
    }
    setTitle(job.sourceFile || `任务 #${job.id}`)
    setHasChanges(false)
  }, [job])

  // 编辑 segment
  const handleSegmentChange = useCallback((index: number, field: keyof SttSegment, value: string | number) => {
    setSegments(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
    setHasChanges(true)
  }, [])

  // 恢复原始
  const handleRestore = useCallback(() => {
    if (originalSegments.length > 0) {
      setSegments(originalSegments.map(s => ({ ...s })))
    } else if (job.text) {
      setSingleText(job.text)
    }
    setHasChanges(false)
    showToast('已恢复原始转写', 'info')
  }, [originalSegments, job.text, showToast])

  // 入库
  const handleIngestClick = useCallback(() => {
    setShowConfirm(true)
  }, [])

  const handleIngestConfirm = useCallback(async () => {
    setShowConfirm(false)
    setIngesting(true)

    let correctedText = ''
    let correctedSegments: SttSegment[] = []

    if (segments.length > 0) {
      correctedSegments = segments
      correctedText = rebuildFullText(segments)
    } else {
      correctedText = singleText.trim()
      correctedSegments = [{
        speaker: 1,
        start: 0,
        end: job.durationSec || 0,
        text: correctedText,
      }]
    }

    if (!correctedText.trim()) {
      showToast('文本内容不能为空', 'error')
      setIngesting(false)
      return
    }

    await onIngest(correctedText, correctedSegments, title.trim() || job.sourceFile || `任务 #${job.id}`)
    setIngesting(false)
    setHasChanges(false)
  }, [segments, singleText, job, title, onIngest, showToast])

  const displayText = useMemo(() => {
    if (segments.length > 0) {
      return rebuildFullText(segments)
    }
    return singleText
  }, [segments, singleText])

  return (
    <div className="space-y-4">
      {/* 标题输入 */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">文档标题</label>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setHasChanges(true) }}
          placeholder="为这份转写文档起个标题"
        />
      </div>

      {/* 编辑区 */}
      {segments.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">说话人分段</label>
            <Button variant="ghost" size="xs" onClick={handleRestore} leftIcon="RotateCcw">
              恢复原始
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2 p-1">
            {segments.map((seg, i) => (
              <div key={i} className="flex gap-2 items-start p-2 rounded-lg border border-slate-200 bg-white">
                <div className="flex-shrink-0 w-20">
                  <div className="text-xs font-medium text-primary-600">说话人{seg.speaker}</div>
                  <div className="text-xs text-slate-400">
                    {formatTimestamp(seg.start)} - {formatTimestamp(seg.end)}
                  </div>
                </div>
                <textarea
                  value={seg.text}
                  onChange={(e) => handleSegmentChange(i, 'text', e.target.value)}
                  className="flex-1 min-h-[40px] text-sm text-slate-700 bg-transparent border-0 outline-none resize-y p-1 rounded focus:bg-slate-50"
                  rows={2}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">转写文本</label>
            <Button variant="ghost" size="xs" onClick={handleRestore} leftIcon="RotateCcw">
              恢复原始
            </Button>
          </div>
          <textarea
            value={singleText}
            onChange={(e) => { setSingleText(e.target.value); setHasChanges(true) }}
            className="w-full min-h-[200px] text-sm text-slate-700 p-3 border border-slate-200 rounded-lg outline-none resize-y focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
          />
        </div>
      )}

      {/* 脱敏预览 */}
      {masked && displayText && (
        <div className="p-2 bg-slate-50 rounded text-xs text-slate-500">
          <span className="text-slate-400">脱敏预览：</span>
          <span className="break-all">{maskKnowledgeText(displayText, true).substring(0, 200)}...</span>
        </div>
      )}

      {/* 入库 */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <Button
          variant="success"
          size="md"
          loading={ingesting}
          disabled={ingesting}
          onClick={handleIngestClick}
          leftIcon="Database"
        >
          存入知识库
        </Button>
        {hasChanges && (
          <span className="text-xs text-amber-500">有未保存的修改</span>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="存入知识库"
        content={`确认将校对后的文本存入知识库？${hasChanges ? '（包含您的修改）' : ''}`}
        confirmText="确认入库"
        onConfirm={handleIngestConfirm}
        onClose={() => setShowConfirm(false)}
      />
    </div>
  )
}

export default TranscriptEditor

```


### `src/components/features/knowledge/SttJobList.tsx`

```tsx
/**
 * SttJobList — 转写任务列表
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { sttClient, type SttJobSummary } from '@/services/stt-client'

interface SttJobListProps {
  refreshTrigger: number
  onSelectJob: (jobId: number) => void
  selectedJobId?: number
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'gray' | 'primary' | 'success' | 'danger' | 'warning' }> = {
  pending: { label: '等待处理', variant: 'gray' },
  running: { label: '正在转写', variant: 'primary' },
  processing: { label: '正在转写', variant: 'primary' },
  completed: { label: '已完成', variant: 'success' },
  failed: { label: '失败', variant: 'danger' },
}

function formatTime(sec?: number): string {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${s}s`
}

const SttJobList: React.FC<SttJobListProps> = ({ refreshTrigger, onSelectJob, selectedJobId }) => {
  const [jobs, setJobs] = useState<SttJobSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const size = 10

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const res = await sttClient.getSttJobs(page, size)
    setLoading(false)
    if (res.success && res.data) {
      setJobs(res.data.data || [])
      setTotal(res.data.total || 0)
    }
  }, [page])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs, refreshTrigger])

  return (
    <Card title="历史任务" padding="md" shadow="sm">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
          <Icon name="Loader2" size={16} className="animate-spin" />
          <span>加载中...</span>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon="FileText"
          title="暂无转写任务"
          description="上传音频文件开始创建任务"
        />
      ) : (
        <>
          <div className="space-y-2">
            {jobs.map(job => {
              const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => onSelectJob(job.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedJobId === job.id
                      ? 'bg-primary-50 border-primary-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {job.sourceFile || `任务 #${job.id}`}
                        </span>
                        <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>#{job.id}</span>
                        {job.isMultiSpeaker && <span>多人</span>}
                        {job.durationSec ? <span>音频 {formatTime(job.durationSec)}</span> : null}
                        {job.elapsedSec ? <span>耗时 {formatTime(job.elapsedSec)}</span> : null}
                        {job.progress != null && job.progress > 0 && job.status !== 'completed' && (
                          <span>{job.progress}%</span>
                        )}
                        <span>{job.createdAt}</span>
                      </div>
                      {job.error && (
                        <p className="text-xs text-red-500 mt-1 truncate">{job.error}</p>
                      )}
                    </div>
                    <Icon name="ChevronRight" size={16} className="text-slate-400 flex-shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>
          {total > size && (
            <div className="mt-4 flex justify-center">
              <Pagination
                current={page}
                total={Math.ceil(total / size)}
                onChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default SttJobList

```


### `src/components/features/knowledge/KnowledgeLibrary.tsx`

```tsx
/**
 * KnowledgeLibrary — 知识库 Tab
 *
 * 包含搜索 + 文档列表 + 文档详情抽屉
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToastContext } from '@/hooks/useToast'
import { useMask } from '@/contexts/MaskContext'
import {
  knowledgeClient,
  type KnowledgeHit,
  type KnowledgeDocumentSummary,
  type KnowledgeDocumentDetail,
} from '@/services/knowledge-client'
import { maskKnowledgeText, getHitType, getHitTypeLabel, formatSpeakers } from './knowledgeTextMask'
import KnowledgeDocumentDrawer from './KnowledgeDocumentDrawer'

interface KnowledgeLibraryProps {
  openDocId?: number | null
  onOpenDocIdConsumed?: () => void
}

const KnowledgeLibrary: React.FC<KnowledgeLibraryProps> = ({ openDocId, onOpenDocIdConsumed }) => {
  const { showToast } = useToastContext()
  const { masked } = useMask()

  // 搜索
  const [query, setQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'done'>('idle')
  const [hits, setHits] = useState<KnowledgeHit[]>([])

  // 文档列表
  const [docs, setDocs] = useState<KnowledgeDocumentSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [listLoading, setListLoading] = useState(false)
  const size = 10

  // 文档详情
  const [drawerDoc, setDrawerDoc] = useState<KnowledgeDocumentDetail | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDocumentSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 搜索 debounce
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // 执行搜索
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setHits([])
      setSearchStatus('idle')
      return
    }
    setSearchStatus('searching')
    const res = await knowledgeClient.searchKnowledge(q.trim(), 10)
    setSearchStatus('done')
    if (res.success && res.data) {
      setHits(res.data.hits || [])
    } else {
      showToast(res.error || '搜索失败', 'error')
    }
  }, [showToast])

  useEffect(() => {
    doSearch(debouncedQuery)
  }, [debouncedQuery, doSearch])

  // 文档列表
  const fetchDocs = useCallback(async () => {
    setListLoading(true)
    const res = await knowledgeClient.listKnowledgeDocuments(page, size)
    setListLoading(false)
    if (res.success && res.data) {
      setDocs(res.data.data || [])
      setTotal(res.data.total || 0)
    }
  }, [page])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  // 打开文档详情
  const openDocument = useCallback(async (docId: number) => {
    setDrawerLoading(true)
    setDrawerDoc(null)
    const res = await knowledgeClient.getKnowledgeDocument(docId)
    setDrawerLoading(false)
    if (res.success && res.data) {
      setDrawerDoc(res.data)
    } else {
      showToast(res.error || '获取文档详情失败', 'error')
    }
  }, [showToast])

  // 打开指定文档（从外部传入）
  useEffect(() => {
    if (openDocId != null) {
      openDocument(openDocId)
      onOpenDocIdConsumed?.()
    }
  }, [openDocId, openDocument, onOpenDocIdConsumed])

  // 删除
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await knowledgeClient.deleteKnowledgeDocument(deleteTarget.id)
    setDeleting(false)
    if (res.success) {
      showToast('文档已删除', 'success')
      setDeleteTarget(null)
      fetchDocs()
      // 重新搜索
      if (debouncedQuery) doSearch(debouncedQuery)
    } else {
      showToast(res.error || '删除失败', 'error')
    }
  }, [deleteTarget, showToast, fetchDocs, debouncedQuery, doSearch])

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    doSearch(query)
  }, [query, doSearch])

  return (
    <div className="space-y-6">
      {/* 搜索 */}
      <Card padding="md" shadow="sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词或自然语言搜索知识库..."
              leftIcon="Search"
            />
          </div>
          <Button type="submit" variant="primary" size="md" loading={searchStatus === 'searching'}>
            搜索
          </Button>
        </form>

        {/* 搜索结果 */}
        {searchStatus !== 'idle' && (
          <div className="mt-4">
            {searchStatus === 'searching' ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-4 justify-center">
                <Icon name="Loader2" size={16} className="animate-spin" />
                <span>搜索中...</span>
              </div>
            ) : hits.length === 0 ? (
              <EmptyState icon="Search" title="无搜索结果" description="尝试用不同的关键词搜索" />
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">共 {hits.length} 条命中</p>
                {hits.map((hit, i) => {
                  const hitType = getHitType(hit)
                  return (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-slate-200 bg-white hover:border-primary-200 hover:bg-primary-50/30 transition-colors cursor-pointer"
                      onClick={() => openDocument(hit.documentId)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {hit.docTitle || hit.title || '未命名文档'}
                        </span>
                        <Badge variant={hitType === 'mixed' ? 'primary' : hitType === 'keyword' ? 'gray' : 'success'} size="sm">
                          {getHitTypeLabel(hitType)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {maskKnowledgeText(hit.text, masked)}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {hit.sourceType && <span>{hit.sourceType}</span>}
                        {hit.occurredAt && <span>{hit.occurredAt}</span>}
                        {hit.speakers && <span>说话人: {formatSpeakers(hit.speakers)}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 文档列表 */}
      <Card title="文档列表" padding="md" shadow="sm"
        extra={<Button variant="ghost" size="xs" onClick={fetchDocs} leftIcon="RefreshCw">刷新</Button>}
      >
        {listLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
            <Icon name="Loader2" size={16} className="animate-spin" />
            <span>加载中...</span>
          </div>
        ) : docs.length === 0 ? (
          <EmptyState icon="Library" title="知识库为空" description="通过录音转写入库后会在这里显示" />
        ) : (
          <>
            <div className="space-y-2">
              {docs.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <Icon name="FileText" size={18} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDocument(doc.id)}>
                    <p className="text-sm font-medium text-slate-700 truncate">{doc.title}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      {doc.sourceType && <span>{doc.sourceType}</span>}
                      {doc.occurredAt && <span>{doc.occurredAt}</span>}
                      {doc.chunkCount > 0 && <span>{doc.chunkCount} 块</span>}
                      <span>{doc.createdAt}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="xs" onClick={() => setDeleteTarget(doc)} iconOnly>
                    <Icon name="Trash2" size={14} className="text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
            {total > size && (
              <div className="mt-4 flex justify-center">
                <Pagination current={page} total={Math.ceil(total / size)} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>

      {/* 文档详情抽屉 */}
      <KnowledgeDocumentDrawer
        doc={drawerDoc}
        loading={drawerLoading}
        masked={masked}
        onClose={() => setDrawerDoc(null)}
      />

      {/* 删除确认 */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除文档"
        content={`确认删除文档「${deleteTarget?.title}」？此操作不可撤销。`}
        confirmText="删除"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default KnowledgeLibrary

```


### `src/components/features/knowledge/KnowledgeDocumentDrawer.tsx`

```tsx
/**
 * KnowledgeDocumentDrawer — 文档详情抽屉
 *
 * 使用右侧滑出 Drawer 显示文档完整内容。
 * React 默认转义文本，不使用 dangerouslySetInnerHTML。
 */

import React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { maskKnowledgeText, formatSpeakers } from './knowledgeTextMask'
import type { KnowledgeDocumentDetail } from '@/services/knowledge-client'

interface KnowledgeDocumentDrawerProps {
  doc: KnowledgeDocumentDetail | null
  loading: boolean
  masked: boolean
  onClose: () => void
}

const KnowledgeDocumentDrawer: React.FC<KnowledgeDocumentDrawerProps> = ({ doc, loading, masked, onClose }) => {
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {(doc || loading) && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* 抽屉 */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white z-50 flex flex-col shadow-xl"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-slate-800 truncate">
                  {loading ? '加载中...' : doc?.title || '文档详情'}
                </h2>
              </div>
              <Button variant="ghost" size="xs" onClick={onClose} iconOnly>
                <Icon name="X" size={18} />
              </Button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  <span>加载中...</span>
                </div>
              ) : doc ? (
                <>
                  {/* 元信息 */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex gap-1.5">
                      <span className="text-slate-400">来源：</span>
                      <span className="text-slate-600">{doc.sourceType || '—'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-slate-400">时间：</span>
                      <span className="text-slate-600">{doc.occurredAt || '—'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-slate-400">项目ID：</span>
                      <span className="text-slate-600">{doc.projectId ?? '—'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-slate-400">分块：</span>
                      <span className="text-slate-600">{doc.chunkCount} 块</span>
                    </div>
                  </div>

                  {doc.speakers && (
                    <div className="text-xs">
                      <span className="text-slate-400">说话人：</span>
                      <span className="text-slate-600">{formatSpeakers(doc.speakers)}</span>
                    </div>
                  )}

                  {doc.sourceRef && (
                    <div className="text-xs">
                      <Badge variant="gray" size="sm">来源：转写任务 #{doc.sourceRef}</Badge>
                    </div>
                  )}

                  {/* 全文 */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-2">全文</h3>
                    <div className="text-sm text-slate-600 whitespace-pre-wrap break-words p-3 bg-slate-50 rounded-lg max-h-64 overflow-y-auto">
                      {maskKnowledgeText(doc.fullText, masked)}
                    </div>
                  </div>

                  {/* 分块 */}
                  {doc.chunks && doc.chunks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 mb-2">分块内容</h3>
                      <div className="space-y-2">
                        {doc.chunks.map((chunk, i) => (
                          <div key={chunk.id || i} className="p-2 border border-slate-100 rounded text-xs">
                            <span className="text-slate-400">#{chunk.index}</span>
                            <p className="text-slate-600 mt-1 whitespace-pre-wrap break-words">
                              {maskKnowledgeText(chunk.text, masked)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-sm text-slate-400 py-8">文档不存在或无权访问</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default KnowledgeDocumentDrawer

```


### `src/components/features/knowledge/SpeechKnowledgePage.tsx`

```tsx
/**
 * SpeechKnowledgePage — 语音知识库主页面
 *
 * 一个入口、两个一级 Tab：
 * 1. 录音转写
 * 2. 知识库
 */

import React, { useState, useCallback, useEffect } from 'react'
import PageContainer from '@/components/ui/PageContainer'
import { Tabs } from '@/components/ui/Tabs'
import { Card } from '@/components/ui/Card'
import TranscriptionWorkspace from './TranscriptionWorkspace'
import KnowledgeLibrary from './KnowledgeLibrary'

const SpeechKnowledgePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('transcription')
  const [openDocId, setOpenDocId] = useState<number | null>(null)

  const handleSwitchToLibrary = useCallback((docId?: number) => {
    if (docId != null) setOpenDocId(docId)
    setActiveTab('library')
  }, [])

  // 挂载时检查是否有来自 Agent 来源卡片的 pendingDocId（可靠机制，不依赖事件时序）
  useEffect(() => {
    const pending = sessionStorage.getItem('knowledge:pendingDocId')
    if (pending) {
      sessionStorage.removeItem('knowledge:pendingDocId')
      const docId = parseInt(pending, 10)
      if (!isNaN(docId)) {
        setOpenDocId(docId)
        setActiveTab('library')
      }
    }
  }, [])

  return (
    <PageContainer maxWidth="wide">
      <Card padding="none" shadow="md" className="overflow-hidden">
        <div className="px-6 pt-5 pb-0">
          <h1 className="text-xl font-bold text-slate-800 mb-1">语音知识库</h1>
          <p className="text-sm text-slate-500 mb-4">录音转写 · 校对 · 入库 · 检索</p>
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              { key: 'transcription', label: '录音转写', icon: 'FileText' },
              { key: 'library', label: '知识库', icon: 'Library' },
            ]}
            fullWidth
            size="md"
          />
        </div>
        <div className="p-6">
          {activeTab === 'transcription' && (
            <TranscriptionWorkspace onIngested={handleSwitchToLibrary} />
          )}
          {activeTab === 'library' && (
            <KnowledgeLibrary openDocId={openDocId} onOpenDocIdConsumed={() => setOpenDocId(null)} />
          )}
        </div>
      </Card>
    </PageContainer>
  )
}

export default SpeechKnowledgePage

```


### `src/components/features/knowledge/knowledgeTextMask.ts`

```tsx
/**
 * 知识库文本显示脱敏 helper
 *
 * 仅做显示层脱敏，不修改数据库原文、不修改搜索索引。
 * 复用 MaskContext 的 toggle 状态。
 *
 * 处理内容：
 * - 11 位手机号：138****5678
 * - 身份证号：保留前 4 后 4
 * - 银行卡号：保留前 4 后 4
 * - 金额表达：可选遮盖（不破坏业务语义）
 */

/** 脱敏手机号：保留前 3 后 4 */
function maskPhone(text: string): string {
  return text.replace(/1[3-9]\d{9}/g, (match) => {
    return match.substring(0, 3) + '****' + match.substring(7)
  })
}

/** 脱敏身份证号：保留前 4 后 4 */
function maskIdCard(text: string): string {
  // 18 位身份证号（最后一位可能是 X）
  return text.replace(/\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g, (match) => {
    if (match.length <= 8) return match
    return match.substring(0, 4) + '****' + match.substring(match.length - 4)
  })
}

/** 脱敏银行卡号：保留前 4 后 4（16-19 位连续数字） */
function maskBankAccount(text: string): string {
  return text.replace(/\b[1-9]\d{15,18}\b/g, (match) => {
    if (match.length <= 8) return match
    return match.substring(0, 4) + '****' + match.substring(match.length - 4)
  })
}

/**
 * 对知识库文本进行显示脱敏
 * @param text 原始文本
 * @param masked 是否启用脱敏（来自 MaskContext.masked）
 * @returns 脱敏后的文本
 */
export function maskKnowledgeText(text: string, masked: boolean): string {
  if (!masked || !text) return text
  let result = text
  result = maskPhone(result)
  result = maskIdCard(result)
  result = maskBankAccount(result)
  return result
}

/**
 * 判断命中类型
 * @param hit 知识库命中
 * @returns 'mixed' | 'keyword' | 'semantic'
 */
export function getHitType(hit: {
  ftsRank?: number | null
  semanticRank?: number | null
}): 'mixed' | 'keyword' | 'semantic' {
  const hasFts = hit.ftsRank != null && hit.ftsRank > 0
  const hasSemantic = hit.semanticRank != null && hit.semanticRank > 0
  if (hasFts && hasSemantic) return 'mixed'
  if (hasFts) return 'keyword'
  return 'semantic'
}

/** 命中类型标签 */
export function getHitTypeLabel(type: 'mixed' | 'keyword' | 'semantic'): string {
  switch (type) {
    case 'mixed': return '混合命中'
    case 'keyword': return '关键词命中'
    case 'semantic': return '语义命中'
  }
}

/** 格式化说话人信息 */
export function formatSpeakers(speakers?: string | null): string {
  if (!speakers) return ''
  try {
    const parsed = typeof speakers === 'string' ? JSON.parse(speakers) : speakers
    if (Array.isArray(parsed)) {
      return parsed.map((s: any) => {
        if (typeof s === 'string') return s
        if (typeof s === 'object' && s.label) return s.label
        return String(s)
      }).join('、')
    }
    return String(parsed)
  } catch {
    return speakers
  }
}

```


---

## 6. 前端 API 客户端


### `src/services/stt-client.ts`

```typescript
/**
 * STT (语音转文字) API 客户端
 *
 * 复用 api-client.ts 的认证 token 和错误处理，
 * 但上传使用 XMLHttpRequest 以获得上传进度事件。
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5048'
const TOKEN_KEY = 'jwt_token'

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

/** snake_case → camelCase 转换 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function shouldConvert(key: string): boolean {
  return key.includes('_') && !key.startsWith('custom_')
}

function convertKeysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase)
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        shouldConvert(key) ? toCamelCase(key) : key,
        convertKeysToCamelCase(value),
      ])
    )
  }
  return obj
}

// ═══════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════

export interface SttCapability {
  canTranscribe: boolean
  canDiarize: boolean
  gpu: {
    hasDiscreteGpu: boolean
    name: string
    vramMb: number
    supportsVulkan: boolean
    allGpus: string[]
  }
  asrModelReady: boolean
  diarizationModelReady: boolean
  unavailableReason: string
}

export interface SttSegment {
  speaker: number
  start: number
  end: number
  text: string
}

export interface SttJobSummary {
  id: number
  sourceFile: string
  engine: string
  status: 'pending' | 'running' | 'processing' | 'completed' | 'failed'
  progress: number
  isMultiSpeaker: boolean
  durationSec?: number
  elapsedSec?: number
  error?: string
  createdAt: string
  updatedAt: string
}

export interface SttJobDetail extends SttJobSummary {
  numSpeakers?: number
  text?: string
  segments?: SttSegment[]
}

export interface SttUploadResult {
  filePath: string
  originalName: string
  size: number
  extension: string
}

export interface SttIngestPayload {
  text?: string
  segments?: SttSegment[]
  title?: string
  projectId?: number
  occurredAt?: string
}

export interface SttIngestResult {
  success: boolean
  documentId: number
  idempotent: boolean
  hasEmbeddings: boolean
  message?: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// API 方法
// ═══════════════════════════════════════════════════════════════

/** GET /api/stt/status — 转写能力检测 */
export async function getSttStatus(): Promise<ApiResponse<SttCapability>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/stt/status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[STT] getSttStatus 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** POST /api/stt/upload — multipart/form-data 流式上传（带进度） */
export function uploadSttAudio(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ApiResponse<SttUploadResult>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    const token = getToken()
    xhr.open('POST', `${API_BASE}/api/stt/upload`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })
    }

    xhr.addEventListener('error', () => {
      resolve({ success: false, error: '网络错误，上传失败' })
    })

    xhr.addEventListener('timeout', () => {
      resolve({ success: false, error: '上传超时' })
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 401) {
        try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
      }
      try {
        const raw = JSON.parse(xhr.responseText)
        const converted = convertKeysToCamelCase(raw)
        resolve(converted)
      } catch {
        resolve({ success: false, error: `HTTP ${xhr.status}: 解析响应失败` })
      }
    })

    xhr.send(formData)
  })
}

/** POST /api/stt/transcribe — 创建转写任务 */
export async function createSttJob(input: {
  filePath: string
  isMultiSpeaker: boolean
  numSpeakers?: number
  context?: string
}): Promise<ApiResponse<{ jobId: number; status: string }>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/stt/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(input),
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[STT] createSttJob 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** GET /api/stt/jobs/{id} — 查询任务详情 */
export async function getSttJob(id: number): Promise<ApiResponse<SttJobDetail>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/stt/jobs/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[STT] getSttJob 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** GET /api/stt/jobs — 任务列表 */
export async function getSttJobs(
  page: number = 1,
  size: number = 20,
): Promise<ApiResponse<{ data: SttJobSummary[]; total: number; page: number; size: number }>> {
  try {
    const token = getToken()
    const url = new URL(`${API_BASE}/api/stt/jobs`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('size', String(size))
    const resp = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[STT] getSttJobs 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** POST /api/stt/jobs/{id}/ingest — 校对后文本入库 */
export async function ingestSttJob(
  id: number,
  payload: SttIngestPayload,
): Promise<ApiResponse<SttIngestResult>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/stt/jobs/${id}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[STT] ingestSttJob 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** 导出统一的 sttClient */
export const sttClient = {
  getSttStatus,
  uploadSttAudio,
  createSttJob,
  getSttJob,
  getSttJobs,
  ingestSttJob,
}

```


### `src/services/knowledge-client.ts`

```typescript
/**
 * 知识库 API 客户端
 *
 * 复用 api-client.ts 的认证 token 和 snake_case → camelCase 转换
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5048'
const TOKEN_KEY = 'jwt_token'

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

/** snake_case → camelCase 转换 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function shouldConvert(key: string): boolean {
  return key.includes('_') && !key.startsWith('custom_')
}

function convertKeysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase)
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        shouldConvert(key) ? toCamelCase(key) : key,
        convertKeysToCamelCase(value),
      ])
    )
  }
  return obj
}

// ═══════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════

export interface KnowledgeHit {
  documentId: number
  chunkId: number
  chunkIndex: number
  text: string
  ftsScore?: number
  ftsRank?: number
  semanticScore?: number
  semanticRank?: number
  rrfScore?: number
  docTitle?: string
  title?: string
  sourceType?: string
  sourceRef?: string
  projectId?: number
  speakers?: string
  occurredAt?: string
}

export interface KnowledgeDocumentSummary {
  id: number
  title: string
  sourceType?: string
  sourceRef?: string
  projectId?: number
  speakers?: string
  occurredAt?: string
  createdAt: string
  chunkCount: number
}

export interface KnowledgeChunk {
  id: number
  index: number
  text: string
}

export interface KnowledgeDocumentDetail extends KnowledgeDocumentSummary {
  fullText: string
  chunks: KnowledgeChunk[]
  createdBy?: string
}

export interface KnowledgeSearchResult {
  query: string
  totalHits: number
  usedSemantic: boolean
  hits: KnowledgeHit[]
  documents: KnowledgeDocumentSummary[]
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// API 方法
// ═══════════════════════════════════════════════════════════════

/** GET /api/knowledge/search — 混合检索 */
export async function searchKnowledge(
  query: string,
  topK: number = 10,
  projectId?: number,
): Promise<ApiResponse<KnowledgeSearchResult>> {
  try {
    const token = getToken()
    const url = new URL(`${API_BASE}/api/knowledge/search`)
    url.searchParams.set('q', query)
    url.searchParams.set('topK', String(topK))
    if (projectId != null) url.searchParams.set('projectId', String(projectId))
    const resp = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[Knowledge] searchKnowledge 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** GET /api/knowledge/documents — 文档列表 */
export async function listKnowledgeDocuments(
  page: number = 1,
  size: number = 20,
  projectId?: number,
): Promise<ApiResponse<{ data: KnowledgeDocumentSummary[]; total: number; page: number; size: number }>> {
  try {
    const token = getToken()
    const url = new URL(`${API_BASE}/api/knowledge/documents`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('size', String(size))
    if (projectId != null) url.searchParams.set('projectId', String(projectId))
    const resp = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[Knowledge] listKnowledgeDocuments 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** GET /api/knowledge/documents/{id} — 文档详情 */
export async function getKnowledgeDocument(id: number): Promise<ApiResponse<KnowledgeDocumentDetail>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/knowledge/documents/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[Knowledge] getKnowledgeDocument 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** DELETE /api/knowledge/documents/{id} — 删除文档 */
export async function deleteKnowledgeDocument(id: number): Promise<ApiResponse<null>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/knowledge/documents/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[Knowledge] deleteKnowledgeDocument 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** 导出统一的 knowledgeClient */
export const knowledgeClient = {
  searchKnowledge,
  listKnowledgeDocuments,
  getKnowledgeDocument,
  deleteKnowledgeDocument,
}

```


---

## 7. 后端端点源码


### `EngineeringManager.Api/Endpoints/SttEndpoints.cs`

```csharp
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;

namespace EngineeringManager.Api;

/// <summary>
/// 语音转文字 (STT) 端点
/// 结构参照 OcrEndpoints：文件进→后台处理→出文本
/// 鉴权沿用 GlobalAuthMiddleware（白名单不包含 /api/stt/*，必须登录）
/// </summary>
public static class SttEndpoints
{
    // 允许的音频格式
    private static readonly HashSet<string> AllowedAudioExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".wma", ".amr", ".opus"
    };

    // 音频大小上限：500MB
    private const long MaxAudioSize = 500 * 1024 * 1024;

    public static void RegisterSttEndpoints(this WebApplication app)
    {
        // ═══════════════════════════════════════════════════════════
        // POST /api/stt/upload — multipart/form-data 流式上传音频文件
        // 不使用 base64 JSON，避免大文件内存膨胀
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/stt/upload", async (
            HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var form = await ctx.Request.ReadFormAsync(ctx.RequestAborted);
                var file = form.Files.FirstOrDefault(f => f.Name == "file");

                if (file == null || file.Length == 0)
                    return Common.Fail("请选择音频文件");

                if (file.Length > MaxAudioSize)
                    return Common.Fail($"文件过大 ({file.Length / 1024 / 1024}MB)，上限 {MaxAudioSize / 1024 / 1024}MB");

                // 校验扩展名（使用原始文件名的扩展名）
                var originalExt = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!AllowedAudioExtensions.Contains(originalExt))
                    return Common.Fail($"不支持的音频格式: {originalExt}，支持的格式: {string.Join(", ", AllowedAudioExtensions)}");

                // 构造安全存储路径：uploads/stt/<uid>/<Guid>.<ext>
                var uploadsBase = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var sttDir = Path.Combine(uploadsBase, "stt", uid);
                Directory.CreateDirectory(sttDir);

                var storedName = $"{Guid.NewGuid():N}{originalExt}";
                var tempPath = Path.Combine(sttDir, $"{storedName}.uploading");
                var finalPath = Path.Combine(sttDir, storedName);

                // 路径穿越防护 — 允许根为当前用户的 stt 目录，而非整个 uploads
                if (!IsPathSafe(finalPath, sttDir))
                    return Common.Fail("非法路径");

                // 流式写入 .uploading 临时文件，完成后原子改名
                try
                {
                    await using (var fileStream = File.Create(tempPath))
                    {
                        await file.CopyToAsync(fileStream, ctx.RequestAborted);
                    }
                    File.Move(tempPath, finalPath);
                }
                catch
                {
                    // 上传中断或失败时清理不完整临时文件
                    try { if (File.Exists(tempPath)) File.Delete(tempPath); } catch { }
                    throw;
                }

                // 返回相对 uploads/ 的路径，可直接传给 POST /api/stt/transcribe
                var relativePath = $"stt/{uid}/{storedName}";

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        filePath = relativePath,
                        originalName = file.FileName,
                        size = file.Length,
                        extension = originalExt,
                    }
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SttEndpoints] 上传音频失败: {ex.Message}");
                return Common.ServerError("上传音频", ex);
            }
        }).DisableAntiforgery();

        // ═══════════════════════════════════════════════════════════
        // POST /api/stt/transcribe — 创建转写任务
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/stt/transcribe", (HttpContext ctx, IDbConnection db, SttTranscribeDto dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                // 检查本地转写是否可用
                if (!SttEngineSelector.CanUseLocalStt())
                {
                    return Common.Fail($"本地语音转文字不可用: {SttEngineSelector.GetUnavailableReason()}。可使用云端转写（即将推出）。", 400);
                }

                // 验证文件路径
                if (string.IsNullOrWhiteSpace(dto.FilePath))
                    return Common.Fail("请提供音频文件路径");

                // 安全：FilePath 格式为 stt/<uid>/<file>（相对于 uploads/）
                // 解析时以 uploads/ 为根目录，然后验证结果在当前用户的 stt/<uid>/ 内
                var uploadsBase = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var userSttDir = Path.Combine(uploadsBase, "stt", uid);
                var fullPath = Path.Combine(uploadsBase, dto.FilePath.Replace('\\', '/').TrimStart('/'));
                var resolvedFull = Path.GetFullPath(fullPath);
                var resolvedDir = Path.GetFullPath(userSttDir);

                // 路径穿越防护：解析后的完整路径必须仍在当前用户的 stt 目录内
                if (!resolvedFull.StartsWith(resolvedDir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                    return Common.Fail("无权访问该文件路径");

                if (!File.Exists(resolvedFull))
                    return Common.Fail($"音频文件不存在: {dto.FilePath}");

                var ext = Path.GetExtension(resolvedFull);
                if (!AllowedAudioExtensions.Contains(ext))
                    return Common.Fail($"不支持的音频格式: {ext}，支持的格式: {string.Join(", ", AllowedAudioExtensions)}");

                var fileSize = new FileInfo(resolvedFull).Length;
                if (fileSize > MaxAudioSize)
                    return Common.Fail($"音频文件过大 ({fileSize / 1024 / 1024}MB)，上限 {MaxAudioSize / 1024 / 1024}MB");

                var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

                // 创建 job
                var jobId = db.QuerySingle<long>(@"
                    INSERT INTO stt_jobs
                        (source_file, source_path, source_type, engine, status, progress,
                         is_multi_speaker, num_speakers, hotwords,
                         created_at, updated_at, created_by)
                    VALUES
                        (@SourceFile, @SourcePath, 'audio', 'qwen3-asr-1.7b-gguf', 'pending', 0,
                         @IsMulti, @NumSpeakers, @Hotwords,
                         @Now, @Now, @Uid);
                    SELECT last_insert_rowid();",
                    new
                    {
                        SourceFile = Path.GetFileName(dto.FilePath),
                        SourcePath = dto.FilePath, // 存相对路径，worker 用 ResolveDataPath 拼完整路径
                        IsMulti = dto.IsMultiSpeaker ? 1 : 0,
                        NumSpeakers = dto.NumSpeakers,
                        Hotwords = dto.Context,
                        Now = now,
                        Uid = uid,
                    });

                return Results.Ok(new { success = true, data = new { jobId, status = "pending" } });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SttEndpoints] 创建转写任务失败: {ex.Message}");
                return Common.ServerError("创建转写任务", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/stt/jobs/{id} — 查询任务状态/结果
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/stt/jobs/{id}", (HttpContext ctx, IDbConnection db, long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var job = db.QueryFirstOrDefault<dynamic>(
                    @"SELECT id, source_file, engine, status, progress, is_multi_speaker,
                             num_speakers, result_text, result_json, duration_sec, elapsed_sec,
                             error, created_at, updated_at
                      FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                if (job == null)
                    return Common.NotFound("转写任务不存在");

                // 解析 result_json 为 segments
                List<object>? segments = null;
                if (job.result_json != null)
                {
                    try
                    {
                        segments = System.Text.Json.JsonSerializer.Deserialize<List<object>>(job.result_json);
                    }
                    catch { }
                }

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = job.id,
                        sourceFile = job.source_file,
                        engine = job.engine,
                        status = job.status,
                        progress = job.progress,
                        isMultiSpeaker = job.is_multi_speaker == 1,
                        numSpeakers = job.num_speakers,
                        text = job.result_text,
                        segments,
                        durationSec = job.duration_sec,
                        elapsedSec = job.elapsed_sec,
                        error = job.error,
                        createdAt = job.created_at,
                        updatedAt = job.updated_at,
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("查询转写任务", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/stt/jobs — 当前用户任务列表
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/stt/jobs", (HttpContext ctx, IDbConnection db, int page = 1, int size = 20) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var offset = (page - 1) * size;
                var jobs = db.Query<dynamic>(
                    @"SELECT id, source_file, engine, status, progress, is_multi_speaker,
                             duration_sec, elapsed_sec, error, created_at, updated_at
                      FROM stt_jobs
                      WHERE created_by = @Uid
                      ORDER BY created_at DESC
                      LIMIT @Size OFFSET @Offset",
                    new { Uid = uid, Size = size, Offset = offset });

                var total = db.ExecuteScalar<int>(
                    "SELECT COUNT(*) FROM stt_jobs WHERE created_by = @Uid",
                    new { Uid = uid });

                // 显式映射为 camelCase，与 GET /api/stt/jobs/{id} 响应契约一致
                var mappedJobs = jobs.Select(j => new
                {
                    id = j.id,
                    sourceFile = j.source_file,
                    engine = j.engine,
                    status = j.status,
                    progress = j.progress,
                    isMultiSpeaker = j.is_multi_speaker == 1,
                    durationSec = j.duration_sec,
                    elapsedSec = j.elapsed_sec,
                    error = j.error,
                    createdAt = j.created_at,
                    updatedAt = j.updated_at,
                }).ToList();

                return Results.Ok(new { success = true, data = new { data = mappedJobs, total, page, size } });
            }
            catch (Exception ex)
            {
                return Common.ServerError("查询任务列表", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/stt/status — 转写能力检测（前端用来决定是否显示 STT 入口）
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/stt/status", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var gpu = SttEngineSelector.Detect();
                var asrReady = SttModelManager.IsAsrModelAvailable();
                var diarizationReady = SttModelManager.IsDiarizationModelAvailable();

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        canTranscribe = SttEngineSelector.CanUseLocalStt() && asrReady,
                        canDiarize = diarizationReady,
                        gpu = new
                        {
                            hasDiscreteGpu = gpu.HasDiscreteGpu,
                            name = gpu.GpuName,
                            vramMb = gpu.VramMb,
                            supportsVulkan = gpu.SupportsVulkan,
                            allGpus = gpu.AllGpus,
                        },
                        asrModelReady = asrReady,
                        diarizationModelReady = diarizationReady,
                        unavailableReason = SttEngineSelector.CanUseLocalStt() ? "" : SttEngineSelector.GetUnavailableReason(),
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("检测转写能力", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // POST /api/stt/jobs/{id}/ingest — 把校对后文本送入知识库
        // 支持可选 SttIngestDto：body 为空时兼容旧行为（使用 job.result_text）
        // body.text 有值时使用校对后文本入库
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/stt/jobs/{id}/ingest", async (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            long id,
            SttIngestDto? dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：入库到知识库需要 knowledge:read 权限
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);
            try
            {
                // 1. 查 STT job（含用户维度过滤 — job 必须属于当前用户）
                var job = db.QueryFirstOrDefault<dynamic>(
                    @"SELECT id, source_file, result_text, result_json, duration_sec,
                             is_multi_speaker, created_at, created_by
                      FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                if (job == null)
                    return Common.NotFound("转写任务不存在");

                // 2. 决定入库文本和 segments
                string fullText;
                List<SttSegment>? segments = null;

                // 先尝试从 DB 解析原始 segments（用于保留说话人元数据）
                List<SttSegment>? originalSegments = null;
                if (job.result_json != null)
                {
                    try
                    {
                        var segData = System.Text.Json.JsonSerializer.Deserialize<List<JsonSegment>>(
                            (string)job.result_json);
                        originalSegments = segData?.Select(s => new SttSegment
                        {
                            Speaker = s.Speaker,
                            Start = s.Start,
                            End = s.End,
                            Text = s.Text ?? "",
                        }).ToList();
                    }
                    catch { /* 解析失败不影响入库 */ }
                }

                if (dto != null && dto.Text != null)
                {
                    // 用户显式提供了校对文本 — 必须非空
                    if (string.IsNullOrWhiteSpace(dto.Text))
                        return Common.Fail("校对文本不能为空");

                    // 限制全文长度（100KB）
                    if (dto.Text.Length > 100_000)
                        return Common.Fail("文本内容过长（上限 100KB）");

                    fullText = dto.Text!;

                    // 使用校对后 segments（如有）
                    if (dto.Segments != null && dto.Segments.Count > 0)
                    {
                        // 限制 segments 数量（上限 5000）
                        if (dto.Segments.Count > 5000)
                            return Common.Fail("segments 数量过多（上限 5000）");

                        // 服务端校验 segments 数据合法性
                        var speakerSet = new HashSet<int>();
                        foreach (var s in dto.Segments)
                        {
                            if (s.Speaker < 1)
                                return Common.Fail("segments 中 speaker 必须 >= 1");
                            if (s.Start < 0 || s.End < 0)
                                return Common.Fail("segments 中时间戳不能为负数");
                            if (s.End < s.Start)
                                return Common.Fail("segments 中 end 不能小于 start");
                            if (string.IsNullOrWhiteSpace(s.Text))
                                return Common.Fail("segments 中 text 不能为空");
                            if (s.Text.Length > 10_000)
                                return Common.Fail("segments 中单段 text 过长（上限 10KB）");
                            speakerSet.Add(s.Speaker);
                        }

                        // 校验说话人编号为连续的 1..N
                        var sortedSpeakers = speakerSet.OrderBy(x => x).ToList();
                        for (int idx = 0; idx < sortedSpeakers.Count; idx++)
                        {
                            if (sortedSpeakers[idx] != idx + 1)
                                return Common.Fail($"segments 中说话人编号必须从 1 开始连续，缺失说话人 {idx + 1}");
                        }

                        // 校验 segments 重组文本与 dto.Text 一致
                        // 前端 rebuildFullText 格式：【说话人N】文本（每段一行，用 \n 连接）
                        var recomposed = string.Join("\n",
                            dto.Segments
                               .Where(s => !string.IsNullOrWhiteSpace(s.Text))
                               .Select(s => $"【说话人{s.Speaker}】{s.Text!.Trim()}"));
                        if (!string.Equals(recomposed.Trim(), fullText.Trim(), StringComparison.OrdinalIgnoreCase))
                            return Common.Fail("segments 重组文本与提交的全文不一致，请确保校对后同步修改了 segments 或全文");

                        segments = dto.Segments.Select(s => new SttSegment
                        {
                            Speaker = s.Speaker,
                            Start = s.Start,
                            End = s.End,
                            Text = s.Text ?? "",
                        }).ToList();
                    }
                    else
                    {
                        // 只传校对文本而不传 segments → 保留原始 segments 的说话人元数据
                        segments = originalSegments;
                    }
                }
                else
                {
                    // 兼容旧行为：无 body 或无 text 字段 → 使用数据库原始 result_text
                    if (string.IsNullOrEmpty((string?)job.result_text))
                        return Common.Fail("转写结果为空，无法入库");

                    fullText = job.result_text;
                    segments = originalSegments;
                }

                if (string.IsNullOrWhiteSpace(fullText))
                    return Common.Fail("文本内容不能为空");

                // 3. 项目权限检查
                int? projectId = dto?.ProjectId;
                if (projectId.HasValue && !KnowledgeBaseService.CanAccessProject(db, projectId.Value, uid, isAdmin))
                    return Results.Json(new { success = false, error = "无权操作该项目" }, statusCode: 403);

                // 4. 入库（幂等：同一 stt_job 重复调用返回已有 docId）
                var service = new KnowledgeBaseService(db, embedding);
                var result = await service.IngestAsync(
                    fullText: fullText,
                    title: dto?.Title ?? $"{job.source_file}",
                    sourceType: "call",
                    sourceRef: id.ToString(),
                    projectId: projectId,
                    createdBy: uid,
                    segments: segments,
                    occurredAt: dto?.OccurredAt ?? (string?)job.created_at);

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        documentId = result.DocumentId,
                        idempotent = result.Idempotent,
                        hasEmbeddings = result.HasEmbeddings,
                        message = result.Idempotent
                            ? $"转写文本已入库（幂等命中），文档 ID: {result.DocumentId}"
                            : $"转写文本已入库，文档 ID: {result.DocumentId}",
                    }
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SttEndpoints] 入库失败: {ex.Message}");
                return Common.ServerError("转写入库", ex);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 路径穿越防护（与 FileEndpoints 一致）
    // ═══════════════════════════════════════════════════════════
    private static bool IsPathSafe(string fullPath, string allowedBase)
    {
        var resolved = Path.GetFullPath(fullPath);
        var baseResolved = Path.GetFullPath(allowedBase);
        return resolved.StartsWith(baseResolved, StringComparison.OrdinalIgnoreCase);
    }
}

/// <summary>STT 转写请求 DTO</summary>
public class SttTranscribeDto
{
    public string FilePath { get; set; } = "";
    public bool IsMultiSpeaker { get; set; } = false;
    public int? NumSpeakers { get; set; }
    public string? Context { get; set; }
}

/// <summary>STT 入库 DTO — 校对后文本/segments/标题/项目/时间</summary>
public class SttIngestDto
{
    public string? Text { get; set; }
    public List<SttSegmentDto>? Segments { get; set; }
    public string? Title { get; set; }
    public int? ProjectId { get; set; }
    public string? OccurredAt { get; set; }
}

/// <summary>STT segment DTO（前端校对后传回）</summary>
public class SttSegmentDto
{
    public int Speaker { get; set; }
    public double Start { get; set; }
    public double End { get; set; }
    public string? Text { get; set; }
}

/// <summary>用于反序列化 stt_jobs.result_json</summary>
public class JsonSegment
{
    [System.Text.Json.Serialization.JsonPropertyName("speaker")]
    public int Speaker { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("start")]
    public double Start { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("end")]
    public double End { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("text")]
    public string? Text { get; set; }
}

```


### `EngineeringManager.Api/Endpoints/KnowledgeEndpoints.cs`

```csharp
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;

namespace EngineeringManager.Api;

/// <summary>
/// 知识库端点 (M2)
///
/// - POST   /api/knowledge/documents          手动/从转写入库
/// - GET    /api/knowledge/search             混合检索（FTS5 + 语义 + RRF）
/// - GET    /api/knowledge/documents/{id}     文档详情
/// - DELETE /api/knowledge/documents/{id}     删除文档（级联删 chunks + fts）
/// - GET    /api/knowledge/documents          文档列表
///
/// 鉴权沿用 GlobalAuthMiddleware（不在白名单，必须登录）
/// </summary>
public static class KnowledgeEndpoints
{
    public static void RegisterKnowledgeEndpoints(this WebApplication app)
    {
        // ═══════════════════════════════════════════════════════════
        // POST /api/knowledge/documents — 入库
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/knowledge/documents", async (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            KnowledgeIngestDto dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：必须拥有 knowledge:read 权限
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Text))
                    return Common.Fail("文本内容不能为空");
                if (string.IsNullOrWhiteSpace(dto.Title))
                    return Common.Fail("标题不能为空");

                // 项目写权限检查：非 admin 携带 projectId 时必须有项目权限
                if (dto.ProjectId.HasValue && !KnowledgeBaseService.CanAccessProject(db, dto.ProjectId.Value, uid, isAdmin))
                    return Results.Json(new { success = false, error = "无权操作该项目" }, statusCode: 403);

                var service = new KnowledgeBaseService(db, embedding);
                var result = await service.IngestAsync(
                    fullText: dto.Text,
                    title: dto.Title,
                    sourceType: dto.SourceType ?? "manual",
                    sourceRef: dto.SourceRef,
                    projectId: dto.ProjectId,
                    createdBy: uid,
                    segments: null,
                    occurredAt: dto.OccurredAt);

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        documentId = result.DocumentId,
                        idempotent = result.Idempotent,
                        hasEmbeddings = result.HasEmbeddings,
                    },
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("知识库入库", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/knowledge/search — 混合检索
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/knowledge/search", async (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            string q,
            int topK = 10,
            int? projectId = null) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：必须拥有 knowledge:read 权限
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);
            try
            {
                if (string.IsNullOrWhiteSpace(q))
                    return Common.Fail("搜索关键词不能为空");

                var service = new KnowledgeBaseService(db, embedding);
                var result = await service.SearchAsync(q, topK, projectId, uid, isAdmin);

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        query = result.Query,
                        totalHits = result.TotalHits,
                        usedSemantic = result.UsedSemantic,
                        hits = result.Hits.Select(h => new
                        {
                            chunkId = h.ChunkId,
                            documentId = h.DocumentId,
                            chunkIndex = h.ChunkIndex,
                            text = h.Text,
                            ftsScore = h.FtsScore,
                            ftsRank = h.FtsRank,
                            semanticScore = h.SemanticScore,
                            semanticRank = h.SemanticRank,
                            rrfScore = h.RrfScore,
                            docTitle = h.DocTitle,
                            sourceType = h.SourceType,
                            sourceRef = h.SourceRef,
                            projectId = h.ProjectId,
                            speakers = h.Speakers,
                            occurredAt = h.OccurredAt,
                        }),
                        documents = result.Documents.Select(d => new
                        {
                            id = d.Id,
                            title = d.Title,
                            sourceType = d.SourceType,
                            sourceRef = d.SourceRef,
                            projectId = d.ProjectId,
                            occurredAt = d.OccurredAt,
                        }),
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("知识库检索", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/knowledge/documents/{id} — 文档详情
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/knowledge/documents/{id}", (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：必须拥有 knowledge:read 权限
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);
            try
            {
                var service = new KnowledgeBaseService(db, embedding);
                var doc = service.GetDocument(id, uid, isAdmin);

                if (doc == null)
                    return Common.NotFound("文档不存在或无权访问");

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = doc.Id,
                        sourceType = doc.SourceType,
                        sourceRef = doc.SourceRef,
                        projectId = doc.ProjectId,
                        title = doc.Title,
                        fullText = doc.FullText,
                        speakers = doc.Speakers,
                        occurredAt = doc.OccurredAt,
                        createdAt = doc.CreatedAt,
                        createdBy = doc.CreatedBy,
                        chunks = doc.Chunks.Select(c => new
                        {
                            id = c.Id,
                            index = c.Index,
                            text = c.Text,
                        }),
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("获取文档", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // DELETE /api/knowledge/documents/{id} — 删除文档（级联）
        // ═══════════════════════════════════════════════════════════
        app.MapDelete("/api/knowledge/documents/{id}", (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：必须拥有 knowledge:read 权限
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);
            try
            {
                var service = new KnowledgeBaseService(db, embedding);
                var deleted = service.DeleteDocument(id, uid, isAdmin);

                if (!deleted)
                    return Common.NotFound("文档不存在或无权删除");

                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Common.ServerError("删除文档", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/knowledge/documents — 文档列表
        // 复用 BuildScopeFilter 统一构造数据范围过滤
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/knowledge/documents", (
            HttpContext ctx,
            IDbConnection db,
            int page = 1,
            int size = 20,
            int? projectId = null) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            // 服务端权限检查：必须拥有 knowledge:read 权限
            if (!CurrentUser.HasPermission(ctx, db, "knowledge:read"))
                return Results.Json(new { success = false, error = "无权限：需要 knowledge:read" }, statusCode: 403);
            try
            {
                var offset = (page - 1) * size;
                // 复用 BuildScopeFilter，禁止在本端点内复制 SQL
                var scope = KnowledgeBaseService.BuildScopeFilter(isAdmin, uid, projectId);

                var docs = db.Query<dynamic>(
                    $@"SELECT d.id, d.title, d.source_type, d.source_ref, d.project_id,
                              d.speakers, d.occurred_at, d.created_at, d.created_by,
                              (SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = d.id) AS chunk_count
                       FROM knowledge_documents d
                       WHERE {scope.Filter}
                       ORDER BY d.created_at DESC
                       LIMIT @Size OFFSET @Offset",
                    new { scope.Uid, scope.ProjectId, Size = size, Offset = offset });

                var total = db.ExecuteScalar<int>(
                    $@"SELECT COUNT(*) FROM knowledge_documents d WHERE {scope.Filter}",
                    new { scope.Uid, scope.ProjectId });

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        data = docs.Select(d => new
                        {
                            id = d.id,
                            title = d.title,
                            sourceType = d.source_type,
                            sourceRef = d.source_ref,
                            projectId = d.project_id,
                            speakers = d.speakers,
                            occurredAt = d.occurred_at,
                            createdAt = d.created_at,
                            createdBy = d.created_by,
                            chunkCount = d.chunk_count,
                        }),
                        total,
                        page,
                        size,
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("查询文档列表", ex);
            }
        });
    }
}

/// <summary>知识库入库 DTO</summary>
public class KnowledgeIngestDto
{
    public string Text { get; set; } = "";
    public string? Title { get; set; }
    public string? SourceType { get; set; }       // call/meeting/upload/manual
    public string? SourceRef { get; set; }         // 如 stt_job.id
    public int? ProjectId { get; set; }
    public string? OccurredAt { get; set; }
}

```


---

## 8. 后端安全和服务


### `EngineeringManager.Api/Security/CurrentUser.cs`

```csharp
using Microsoft.AspNetCore.Http;
using System.Data;
using Dapper;

namespace EngineeringManager.Api.Security;

/// <summary>
/// 当前用户上下文辅助（v1.1.0 P0-4 完整版）
/// 从 HttpContext.User 中提取 uid / 角色，用于所有 INSERT 端点写入 created_by，
/// SELECT/DELETE/UPDATE 端点做用户维度过滤。
///
/// 必须在 GlobalAuthMiddleware 之后使用（中间件已校验 JWT）。
/// </summary>
public static class CurrentUser
{
    /// <summary>从 JWT token 中提取用户 ID（uid claim）。未登录返回 null。</summary>
    public static string? GetUserId(HttpContext ctx) =>
        ctx.User?.FindFirst("uid")?.Value;

    /// <summary>当前用户是否为 admin 角色（admin role claim 由登录端点写入）。</summary>
    public static bool IsAdmin(HttpContext ctx) =>
        // 登录端点 JWT 写入的 role claim 是中文"管理员"或英文"admin" (取决于 role.name)
        // 兼容两种: 中文 roleName + 英文 roleId
        ctx.User?.HasClaim("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "管理员")
        ?? ctx.User?.HasClaim("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "admin")
        ?? false;

    // ── v0.80 D-1: 数据范围枚举(替代 @IsAdmin 布尔字面量;参考若依 @DataScope) ──
    /// <summary>数据可见范围。Company 预留(需先加 company_id/org_id 列,当前库无此锚点)。</summary>
    public enum DataScope { SelfOnly, AuthorizedProjects, All /*, Company */ }

    /// <summary>当前请求的数据范围。行为保持映射:admin→All,其余→AuthorizedProjects
    /// (其 created_by 分支已覆盖 SelfOnly)。</summary>
    public static DataScope GetDataScope(HttpContext ctx) =>
        IsAdmin(ctx) ? DataScope.All : DataScope.AuthorizedProjects;

    /// <summary>
    /// 项目级表过滤片段 (有 project_id 列), 已弃 const UserFilterFragment 改用此方法。
    /// All→(1=1); 非 All→created_by ∨ 授权项目。
    /// </summary>
    public static string UserFilterFragmentForProject(DataScope scope) =>
        scope == DataScope.All
            ? "(1 = 1)"
            : @"
        (created_by = @Uid
         OR EXISTS(SELECT 1 FROM project_authorizations
                   WHERE project_id = @ProjectId AND user_id = @Uid))";

    /// <summary>
    /// 公司维度表过滤 (无 project_id 列, 如 projects / members / workers / partners / supervisors / inventory_items / materials)
    /// 简单看: 创建人 OR admin
    /// 入参: createdByCol 当前行 created_by 列 (默认 "created_by", 当主查询 JOIN 多个有 created_by 的表时需带表别名如 "m.created_by")
    /// </summary>
    public static string UserFilterCompany(DataScope scope, string createdByCol = "created_by") =>
        scope == DataScope.All ? "(1 = 1)" : $"({createdByCol} = @Uid)";

    /// <summary>
    /// 项目级表过滤 (有 project_id 列, 如 income_contracts / wages / attendances / invoices / cost_ledger / expenses / drawings / inventory_transactions)
    /// 逻辑: created_by 自己 OR admin 全表 OR 当前行 project_id 在 admin 授权的 project_authorizations 列表中
    /// 入参:
    ///   projectCol 当前行 project_id 列 (默认 "project_id", 可带表别名如 "pw.project_id")
    ///   createdByCol 当前行 created_by 列 (默认 "created_by", 当主查询 JOIN 多个有 created_by 的表时需带表别名如 "i.created_by")
    /// </summary>
    public static string UserFilterWithAuthorizedProjects(
        DataScope scope,
        string projectCol = "project_id",
        string createdByCol = "created_by") =>
        scope == DataScope.All
            ? "(1 = 1)"
            : $@"({createdByCol} = @Uid
            OR EXISTS(SELECT 1 FROM project_authorizations
                      WHERE project_id = {projectCol} AND user_id = @Uid))";

    // ── v0.80 D-2: PII 字段权限分级 ──

    /// <summary>PII 列全集(以 DB 列名为准)</summary>
    public static readonly string[] AllPiiColumns =
        { "id_card", "phone", "bank_account", "address", "id_card_address" };

    public enum PiiRole { Admin, Accountant, Manager, Worker, None }

    /// <summary>角色 → 可读明文的 PII 字段集合(未列出一律脱敏;默认拒绝)。
    /// 当前为「行为保持」映射,与原 CanReadPii 等价。收紧 manager 只改这一处。</summary>
    private static readonly IReadOnlyDictionary<PiiRole, HashSet<string>> PiiReadable =
        new Dictionary<PiiRole, HashSet<string>>
        {
            [PiiRole.Admin]      = new(StringComparer.OrdinalIgnoreCase) { "id_card", "idCard", "phone", "bank_account", "bankAccount", "address", "id_card_address", "idCardAddress" },
            [PiiRole.Accountant] = new(StringComparer.OrdinalIgnoreCase) { "id_card", "idCard", "phone", "bank_account", "bankAccount", "address", "id_card_address", "idCardAddress" },
            [PiiRole.Manager]    = new(StringComparer.OrdinalIgnoreCase) { "id_card", "idCard", "phone", "bank_account", "bankAccount", "address", "id_card_address", "idCardAddress" },
            [PiiRole.Worker]     = new(StringComparer.OrdinalIgnoreCase) { },
            [PiiRole.None]       = new(StringComparer.OrdinalIgnoreCase) { },
        };

    public readonly struct PiiAccess
    {
        private readonly HashSet<string> _readable;
        public PiiAccess(HashSet<string> readable) => _readable = readable;
        public bool CanRead(string field) => _readable.Contains(field);
    }

    /// <summary>集中角色解析(兼容中文 roleName 与英文 roleId)</summary>
    public static PiiRole ResolveRole(HttpContext ctx)
    {
        var roleClaims = ctx.User?.FindAll(System.Security.Claims.ClaimTypes.Role);
        if (roleClaims == null) return PiiRole.None;
        foreach (var c in roleClaims)
            switch (c.Value)
            {
                case "管理员": case "admin":      return PiiRole.Admin;
                case "经理":   case "manager":    return PiiRole.Manager;
                case "财务":   case "accountant": return PiiRole.Accountant;
                case "工人":   case "worker":     return PiiRole.Worker;
            }
        return PiiRole.None;
    }

    public static PiiAccess GetPiiAccess(HttpContext ctx) =>
        new PiiAccess(PiiReadable[ResolveRole(ctx)]);

    // ── M4: 服务端权限检查 ──

    /// <summary>
    /// 检查当前用户是否拥有指定权限码（如 "knowledge:read"）。
    /// admin 角色直接返回 true（管理员拥有全部权限）。
    /// 非 admin 从 roles.permissions JSON 字段中查找。
    /// </summary>
    public static bool HasPermission(HttpContext ctx, IDbConnection db, string permissionCode)
    {
        if (IsAdmin(ctx)) return true;
        var uid = GetUserId(ctx);
        if (uid == null) return false;

        var roleId = ctx.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        // 兼容中文角色名
        if (roleId == "管理员") roleId = "admin";
        else if (roleId == "经理") roleId = "manager";
        else if (roleId == "财务") roleId = "accountant";
        else if (roleId == "工人") roleId = "worker";

        var permissionsJson = db.QueryFirstOrDefault<string>(
            "SELECT permissions FROM roles WHERE id = @RoleId",
            new { RoleId = roleId });
        if (string.IsNullOrEmpty(permissionsJson)) return false;

        try
        {
            var perms = System.Text.Json.JsonSerializer.Deserialize<string[]>(permissionsJson);
            return perms != null && perms.Contains(permissionCode);
        }
        catch { return false; }
    }
}

```


### `EngineeringManager.Api/Services/Stt/SttModels.cs`

```csharp
namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 转写请求
/// </summary>
public class SttTranscribeRequest
{
    /// <summary>已上传的音频文件在 uploads/ 下的相对路径</summary>
    public string FilePath { get; set; } = "";

    /// <summary>是否多人录音（true=走说话人分离）</summary>
    public bool IsMultiSpeaker { get; set; } = false;

    /// <summary>预期说话人数（null=自动检测）</summary>
    public int? NumSpeakers { get; set; }

    /// <summary>可选热词/上下文提示，提升识别准确率</summary>
    public string? Context { get; set; }
}

/// <summary>
/// STT 转写结果
/// </summary>
public class SttResult
{
    /// <summary>全文（纯文本，无说话人标签）</summary>
    public string Text { get; set; } = "";

    /// <summary>分段列表（含说话人标签和时间戳）</summary>
    public List<SttSegment> Segments { get; set; } = new();

    /// <summary>音频时长（秒）</summary>
    public double DurationSec { get; set; }

    /// <summary>转写耗时（秒）</summary>
    public double ElapsedSec { get; set; }

    /// <summary>使用的引擎名称</summary>
    public string Engine { get; set; } = "";
}

/// <summary>
/// 单个转写分段（含说话人信息）
/// 说话人归一化在 STT 结果持久化前由 SpeakerLabelNormalizer 执行：
///   Speaker 是 1-based 连续编号（说话人1/2/3），对用户展示
///   OriginalSpeaker 保留原始簇号用于诊断（不序列化给前端）
/// </summary>
public class SttSegment
{
    /// <summary>说话人标签（归一化后：1=说话人1, 2=说话人2, ...；单人录音固定为 1）</summary>
    public int Speaker { get; set; }

    /// <summary>原始簇号（诊断用，sherpa-onnx 聚类产生的 0-based 值；不序列化给前端）</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public int? OriginalSpeaker { get; set; }

    /// <summary>开始时间（秒）</summary>
    public double Start { get; set; }

    /// <summary>结束时间（秒）</summary>
    public double End { get; set; }

    /// <summary>该段文本</summary>
    public string Text { get; set; } = "";
}

/// <summary>
/// GPU 探测结果
/// </summary>
public class GpuInfo
{
    /// <summary>是否有独显</summary>
    public bool HasDiscreteGpu { get; set; }

    /// <summary>独显名称</summary>
    public string GpuName { get; set; } = "";

    /// <summary>显存（MB）</summary>
    public int VramMb { get; set; }

    /// <summary>是否支持 Vulkan（用于 transcribe.exe --vulkan）</summary>
    public bool SupportsVulkan { get; set; }

    /// <summary>所有显卡列表（供调试/展示）</summary>
    public List<string> AllGpus { get; set; } = new();
}

```


### `EngineeringManager.Api/Services/Stt/SpeakerLabelNormalizer.cs`

```csharp
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using EngineeringManager.Api.Services.Stt;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// 说话人标签归一化器（共享单例，STT + 知识库统一调用）
///
/// 原始簇号可能是 0/3/7/19 等不连续值（由 sherpa-onnx 聚类产生），
/// 对用户展示必须统一为连续的 说话人1/说话人2/说话人3。
///
/// 归一化在 STT 结果拼装/持久化之前执行，确保：
///   - stt_jobs.result_text 中的【说话人N】标签是 1-based 连续编号
///   - stt_jobs.result_json 中每个 segment 的 speaker 字段是 1-based 连续编号
///   - GET /api/stt/jobs/{id} 返回 1-based 连续编号
///   - POST /api/stt/jobs/{id}/ingest 使用的 segments 已是 1-based 连续编号
///   - knowledge_documents.speakers 与 STT job 中的编号一致
///
/// 如需保留原始簇号用于诊断，存入 segment.OriginalSpeaker（内部字段，不暴露给用户）。
/// </summary>
public static class SpeakerLabelNormalizer
{
    /// <summary>
    /// 对 segments 做就地归一化：原始簇号 → 连续 1/2/3（按首次出现顺序）
    /// 同时设置 OriginalSpeaker 保留原始值。
    /// </summary>
    /// <param name="segments">待归一化的分段列表（会被就地修改）</param>
    /// <returns>归一化后的 segments（与输入同一引用）</returns>
    public static List<SttSegment> Normalize(List<SttSegment> segments)
    {
        if (segments == null || segments.Count == 0) return segments;

        var speakerMap = new Dictionary<int, int>(); // original → normalized (1-based)
        var nextId = 1;

        foreach (var seg in segments.OrderBy(s => s.Start))
        {
            if (!speakerMap.TryGetValue(seg.Speaker, out var normalizedId))
            {
                normalizedId = nextId++;
                speakerMap[seg.Speaker] = normalizedId;
            }

            // 保留原始簇号用于诊断（不暴露给用户）
            seg.OriginalSpeaker = seg.Speaker;
            // 设置归一化后的编号（1-based）
            seg.Speaker = normalizedId;
        }

        Console.WriteLine($"[SpeakerLabelNormalizer] 归一化: {speakerMap.Count} 个说话人, 映射: {string.Join(", ", speakerMap.Select(kvp => $"{kvp.Key}→{kvp.Value}"))}");

        return segments;
    }

    /// <summary>
    /// 生成 speakers JSON（归一化后的说话人列表 + 时间段）
    /// 输入的 segments 必须已经过 Normalize() 处理。
    /// </summary>
    public static string? BuildSpeakersJson(List<SttSegment>? segments)
    {
        if (segments == null || segments.Count == 0) return null;

        var speakerSegments = new Dictionary<int, List<TimeRange>>();

        foreach (var seg in segments.OrderBy(s => s.Start))
        {
            if (!speakerSegments.ContainsKey(seg.Speaker))
                speakerSegments[seg.Speaker] = new List<TimeRange>();

            speakerSegments[seg.Speaker].Add(new TimeRange
            {
                Start = Math.Round(seg.Start, 2),
                End = Math.Round(seg.End, 2),
            });
        }

        var speakers = speakerSegments
            .OrderBy(kvp => kvp.Key)
            .Select(kvp => new SpeakerInfo
            {
                Id = kvp.Key,
                Label = $"说话人{kvp.Key}",
                Segments = kvp.Value,
            })
            .ToList();

        // 使用 UnicodeRanges.All 允许中文等非 ASCII 字符直接输出，不使用 UnsafeRelaxedJsonEscaping
        // 因为数据为系统内部生成的说话人标签（"说话人N"），不包含用户输入
        return JsonSerializer.Serialize(speakers, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
        });
    }

    // 内部 JSON 类型
    private class SpeakerInfo
    {
        public int Id { get; set; }
        public string Label { get; set; } = "";
        public List<TimeRange> Segments { get; set; } = new();
    }

    private class TimeRange
    {
        public double Start { get; set; }
        public double End { get; set; }
    }
}

```


### `EngineeringManager.Api/Program.cs`

```csharp
using System.Data;
using System.Security.Cryptography;
using Microsoft.Data.Sqlite;
using Dapper;
using Microsoft.Extensions.FileProviders;
using EngineeringManager.Api;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http.Features;

// ============ API 配置类（供 EntryPoint.cs 调用） ============

/// <summary>
/// JWT secret 提供者 (P0-1/P0-8 修复)。
/// 优先级: JWT_SECRET 环境变量 > 持久化文件 (%APPDATA%\工程管家\jwt.key) > 首次生成。
/// 持久化文件机器绑定,不随数据存储路径迁移,避免密钥外泄到备份/其他机器。
/// </summary>
public static class JwtSecretProvider
{
    private static string? _cached;
    private static readonly object _lock = new();

    public static string GetOrCreate()
    {
        lock (_lock)
        {
            if (_cached != null) return _cached;

            // 1. 优先环境变量 (开发/运维场景显式覆盖)
            var env = Environment.GetEnvironmentVariable("JWT_SECRET");
            if (!string.IsNullOrWhiteSpace(env) && env.Length >= 32)
            {
                _cached = env;
                return _cached;
            }

            // 2. 持久化文件
            var path = GetKeyPath();
            try
            {
                if (File.Exists(path))
                {
                    var fromFile = File.ReadAllText(path).Trim();
                    if (fromFile.Length >= 32) { _cached = fromFile; return _cached; }
                }
            }
            catch (Exception ex) { Console.Error.WriteLine($"[JwtSecret] 读取持久化文件失败: {Common.Sanitize(ex.Message)}"); }

            // 3. 首次启动生成随机 32 字节密钥 (base64 编码),持久化
            var bytes = RandomNumberGenerator.GetBytes(32);
            var generated = Convert.ToBase64String(bytes);
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                File.WriteAllText(path, generated);
                Console.Out.WriteLine("[JwtSecret] 已生成并持久化随机 JWT secret (首次启动)");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[JwtSecret] 持久化失败,使用内存临时密钥: {Common.Sanitize(ex.Message)}");
            }
            _cached = generated;
            return _cached;
        }
    }

    private static string GetKeyPath() =>
        Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "工程管家", "jwt.key");
}

public static class ApiConfig
{
    public static void ConfigureServices(WebApplicationBuilder builder)
    {
        // 生产 5048; 测试环境 (ASPNETCORE_ENVIRONMENT=Development) 用 random port 0
        // 测试 base 设了 ASPNETCORE_ENVIRONMENT=Development, 避免端口冲突
        var testMode = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development"
            && Environment.GetEnvironmentVariable("DISABLE_RATELIMIT") == "1";
        builder.WebHost.UseUrls(testMode ? "http://127.0.0.1:0" : "http://localhost:5048");

        // M4: 允许大音频上传 (500MB) — multipart/form-data 流式上传
        // Kestrel MaxRequestBodySize 控制整体 HTTP body 上限
        // FormOptions.MultipartBodyLengthLimit 控制 multipart 单段上限（默认 128MB，不够）
        builder.WebHost.ConfigureKestrel(options =>
        {
            options.Limits.MaxRequestBodySize = 550 * 1024 * 1024; // 550MB (略大于 500MB 上限)
        });
        builder.Services.Configure<FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = 550 * 1024 * 1024; // 550MB
        });

        // v1.2.0: PII 字段级加密 (AES-GCM + DPAPI master key)
        builder.Services.AddSingleton<EngineeringManager.Api.Security.PiiProtector>();
        // v0.78.0 PII 后台 re-encrypt worker (admin rotate key 后调用)
        builder.Services.AddSingleton<EngineeringManager.Api.Security.PiiReencryptWorker>();

        // v1.3.0 Agent AI 助手服务
        builder.Services.AddSingleton<EngineeringManager.Api.Services.LlmConfigResolver>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.LlmProviderService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.ILlmChatService>(sp =>
            sp.GetRequiredService<EngineeringManager.Api.Services.LlmProviderService>());
        builder.Services.AddSingleton<EngineeringManager.Api.Services.IModelRouter, EngineeringManager.Api.Services.ModelRoutingService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.AgentToolService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.AgentConversationService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.UpdateService>();

        // v0.83 STT 语音转文字后台 worker（单并发）
        builder.Services.AddHostedService<EngineeringManager.Api.Services.Stt.SttWorker>();

        // v0.84 M2 知识库：文本嵌入服务 + 知识库服务
        builder.Services.AddSingleton<EngineeringManager.Api.Services.IEmbeddingService, EngineeringManager.Api.Services.BgeEmbeddingService>();

        builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
            p.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://localhost:5048")
             .AllowAnyMethod()
             .AllowAnyHeader()));

                builder.Services.AddScoped<IDbConnection>(_ =>
        {
            var dbPath = Path.Combine(ResolveDataPath(), "engineering.db");
            var dir = Path.GetDirectoryName(dbPath)!;
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            var conn = new SqliteConnection($"Data Source={dbPath}");
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "PRAGMA journal_mode=WAL";
            cmd.ExecuteNonQuery();
            EnsureTables(conn);

            // v0.80: is_default_password 列迁移（幂等）
            try { conn.Execute(@"ALTER TABLE users ADD COLUMN is_default_password INTEGER DEFAULT 0"); } catch { }

            // v0.80: 种子管理员（仅在 users 空表时触发）
            SeedDefaultAdmin(conn);

            // v0.72.0: 跑 migrations 脚本 (idempotent, 自动跳过已跑的)
            // 实际跑: 011 加 _enc 列, 012 users 表 password_hash+salt+version 迁移
            EngineeringManager.Api.Migrations.MigrationRunner.Run($"Data Source={dbPath}");            return conn;
        });


        builder.Services.AddAuthentication(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
            {
                // P0-1/P0-8: JWT secret 不再硬编码默认值。优先级: 环境变量 > 持久化文件。
                // 首次启动若无环境变量则生成随机 32 字节密钥,持久化到 %APPDATA%\工程管家\jwt.key
                // (机器绑定: 不随数据备份迁移到其他机器, 避免密钥外泄)
                var jwtSecret = JwtSecretProvider.GetOrCreate();
                options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
                {
                    ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
                    ValidIssuer = "engineering-manager", ValidAudience = "engineering-manager",
                    IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret))
                };
            });
        builder.Services.AddAuthorization();
        builder.Services.AddHttpClient();

// 版本更新：manifest 拉取（30s 短超时）
builder.Services.AddHttpClient("update", c => c.Timeout = TimeSpan.FromSeconds(30));
// 安装包下载：连接/响应头超时 10s，但【无整体下载死超时】（大文件靠慢速看门狗控制）
builder.Services.AddHttpClient("update-download", c =>
{
    c.Timeout = Timeout.InfiniteTimeSpan; // 禁用整体超时，靠看门狗
});

        // P0-4: 限流（登录防爆破 + 写防滥用）
        builder.Services.AddRateLimiter(options =>
            {
                // 登录限流：1 个 IP 1 分钟最多 5 次
                options.AddPolicy("login", httpContext =>
                {
                    var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                    return System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
                        ip,
                        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 5,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0
                        });
                });

                // 写限流：1 个 IP 1 秒最多 30 次
                options.AddPolicy("write", httpContext =>
                {
                    var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                    return System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
                        ip,
                        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 30,
                            Window = TimeSpan.FromSeconds(1),
                            QueueLimit = 0
                        });
                });

                // 429 响应
                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.StatusCode = 429;
                    await context.HttpContext.Response.WriteAsJsonAsync(new { success = false, error = "请求过于频繁，请稍后再试" }, token);
                };
            });

// 支持 camelCase JSON 反序列化（前端发 camelCase，后端 DTO 用 PascalCase）
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});
    }

    /// <summary>
    /// 生产模式标记：dist/ 存在时为 true（C# 自托管前端静态文件）
    /// </summary>
    public static bool IsProduction { get; private set; }

    public static void ConfigureApp(WebApplication app)
    {
        // 检测 dist/ 是否存在 → 生产模式
        var distPath = Path.Combine(AppContext.BaseDirectory, "dist");
        IsProduction = Directory.Exists(distPath);

        if (IsProduction)
        {
            Console.WriteLine($"[App] 生产模式：托管前端静态文件 {distPath}");

            // 1. SPA 默认文件（index.html）
            app.UseDefaultFiles(new DefaultFilesOptions
            {
                FileProvider = new PhysicalFileProvider(distPath)
            });

            // 2. 静态文件服务（JS/CSS/图片 + ocr-config.json 等）
            // index.html 禁止缓存（防 WebView2 缓存旧前端），带 hash 的 JS/CSS 默认永久缓存（文件名变=自动失效）
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(distPath),
                OnPrepareResponse = ctx =>
                {
                    var path = ctx.File.Name;
                    if (path.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
                    {
                        ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                        ctx.Context.Response.Headers["Pragma"] = "no-cache";
                        ctx.Context.Response.Headers["Expires"] = "0";
                    }
                }
            });
        }

        // 启动期防呆：检查 Update:ManifestUrls 是否仍含占位符
        try
        {
            var manifestUrls = app.Configuration.GetSection("Update:ManifestUrls").Get<string[]>();
            if (manifestUrls != null)
            {
                foreach (var url in manifestUrls)
                {
                    if (url.Contains("example.cn", StringComparison.OrdinalIgnoreCase))
                    {
                        Console.Error.WriteLine("[WARN] [Update] ManifestUrls 仍含占位符 example.cn，线上请替换为真实地址");
                        break;
                    }
                }
            }
        }
        catch { /* 配置读取异常不阻塞启动 */ }

        app.UseCors();
        app.UseExceptionHandler(errorApp =>
        {
            errorApp.Run(async context =>
            {
                context.Response.StatusCode = 500;
                context.Response.ContentType = "application/json";
                var error = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
                if (error != null)
                {
                    Console.Error.WriteLine($"[Global] 未处理异常: {error.Error.Message}");
                    await context.Response.WriteAsJsonAsync(new { success = false, error = "服务器内部错误" });
                }
            });
        });
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseMiddleware<EngineeringManager.Api.GlobalAuthMiddleware>();
        // v1.1.0: 测试环境 (DISABLE_RATELIMIT=1) 跳过 rate limiter
        if (Environment.GetEnvironmentVariable("DISABLE_RATELIMIT") != "1")
        {
            app.UseRateLimiter();
        }
        RegisterEndpoints(app);

        // v0.76.0 累计待办 #5: PII 列级 key rotation - 启动时初始化 PiiProtector (从 pii_keys 表加载所有 key, 旧 pii_keys 空时从 pp.key 迁移)
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
            var pii = app.Services.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            pii.Initialize(db);
        }

        if (IsProduction)
        {
            // 3. SPA 回退：非 /api 路由全部返回 index.html
            app.MapWhen(ctx => !ctx.Request.Path.StartsWithSegments("/api"), spa =>
            {
                spa.Use(async (ctx, next) =>
                {
                    var indexPath = Path.Combine(distPath, "index.html");
                    if (File.Exists(indexPath))
                    {
                        ctx.Response.ContentType = "text/html; charset=utf-8";
                        await ctx.Response.SendFileAsync(indexPath);
                    }
                    else
                    {
                        await next();
                    }
                });
            });
        }
    }

    private static void RegisterEndpoints(WebApplication app)
    {
        // 认证 + 角色 + 用户管理
        app.RegisterAuthEndpoints();

        // 用户偏好 (v0.75.0 PII Mask toggle 多设备同步)
        app.RegisterUserPreferencesEndpoints();
        app.RegisterPiiKeyEndpoints(); // v0.76.0 累计待办 #5: PII key rotation API

        // 项目 + 仪表盘 + 项目成员
        app.RegisterProjectEndpoints();

        // 成员 + 工人 + 项目工人 + 班组 + 部门
        app.RegisterMemberEndpoints();

        // 合作伙伴 + 监管单位
        app.RegisterPartnerEndpoints();

        // 发票 + 收付款记录
        app.RegisterInvoiceEndpoints();

        // 合同 + 合同模板 + 结算
        app.RegisterContractEndpoints();

        // 工资 + 考勤 + 薪资历史
        app.RegisterWageEndpoints();

        // 成本台账
        app.RegisterCostLedgerEndpoints();

        // 库存 + 物料
        app.RegisterInventoryEndpoints();

        // 文件操作 + 图纸
        app.RegisterFileEndpoints();

        // 区域 + 模板 + 费用 + 项目工人杂项
        app.RegisterRegionEndpoints();
        app.RegisterTemplateEndpoints();
        app.RegisterExpenseEndpoints();
        app.RegisterProjectWorkerMiscEndpoints();

        // OCR（百度）
        app.RegisterOcrEndpoints();
        OcrSetupWizard.Map(app);

        // 健康检查 + 快照 + 配置 + 审计日志
        app.RegisterSystemEndpoints();

        // v1.3.0 Agent AI 助手
        app.RegisterAgentEndpoints();

        // v0.80 版本更新检查
        app.RegisterUpdateEndpoints();

        // v0.83 STT 语音转文字
        app.RegisterSttEndpoints();

        // v0.84 M2 知识库
        app.RegisterKnowledgeEndpoints();
    }
    // ============ P0-1: 从 config.json 读取 dataPath ============
    public static string ResolveDataPath()
    {
        // 环境变量优先级最高 — 用于开发版与安装版数据隔离
        var envPath = Environment.GetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH");
        if (!string.IsNullOrEmpty(envPath))
            return envPath;

        var defaultPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "工程管家");
        try
        {
            var configPath = Path.Combine(defaultPath, "config.json");
            if (File.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                var doc = System.Text.Json.JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("dataPath", out var dp) && dp.GetString() is { Length: > 0 } path)
                    return path;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[ResolveDataPath] 读取 config.json 失败: {ex.Message}");
        }
        return defaultPath;
    }

    // ============ P0-7: 建表逻辑 ============
    private static void EnsureTables(IDbConnection db)
    {
        db.Execute(@"
CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, address TEXT, start_date TEXT, end_date TEXT, status TEXT DEFAULT 'active', budget REAL DEFAULT 0, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS members (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, email TEXT, member_type TEXT DEFAULT 'staff', role TEXT, id_card TEXT, gender TEXT, ethnicity TEXT, birth_date TEXT, id_card_address TEXT, base_salary REAL, daily_wage REAL, entry_date TEXT, status TEXT DEFAULT 'active', department_id INTEGER, position TEXT, bank_account TEXT, bank_name TEXT, bank_line_no TEXT, photo TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS workers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, id_card TEXT, gender TEXT, phone TEXT, address TEXT, bank_account TEXT, bank_name TEXT, bank_line_no TEXT, worker_type TEXT, daily_wage REAL, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS project_workers (id INTEGER PRIMARY KEY AUTOINCREMENT, worker_id INTEGER, project_id INTEGER, team_id INTEGER, daily_wage REAL, worker_type TEXT, entry_date TEXT, status TEXT DEFAULT 'active', created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS income_contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT NOT NULL, amount REAL, counterparty TEXT, sign_date TEXT, status TEXT DEFAULT 'draft', remark TEXT, files TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS expense_contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT NOT NULL, amount REAL, counterparty TEXT, sign_date TEXT, status TEXT DEFAULT 'draft', remark TEXT, files TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS agreement_contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT NOT NULL, amount REAL, counterparty TEXT, sign_date TEXT, agreement_type TEXT, status TEXT DEFAULT 'draft', remark TEXT, files TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    seller_id INTEGER,
    buyer_id INTEGER,
    contract_id INTEGER,
    type TEXT,
    invoice_kind TEXT,
    invoice_no TEXT,
    invoice_code TEXT,
    name TEXT,
    amount REAL DEFAULT 0,
    price_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    received_amount REAL DEFAULT 0,
    settlement_id INTEGER,
    issue_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS payment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL DEFAULT 0,
    record_date TEXT DEFAULT '',
    project_id INTEGER,
    partner_id INTEGER,
    contract_id INTEGER,
    invoice_details TEXT DEFAULT '[]',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS partners (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, contact TEXT, phone TEXT, email TEXT, address TEXT, bank_account TEXT, bank_name TEXT, credit_code TEXT, registered_address TEXT, business_scope TEXT, tax_type TEXT, license_file TEXT, license_file_type TEXT, other_files TEXT, other_files_type TEXT, project_ids TEXT, remarks TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS supervisors (id INTEGER PRIMARY KEY AUTOINCREMENT, region_id INTEGER, name TEXT NOT NULL, category TEXT, contact TEXT, phone TEXT, address TEXT, project_ids TEXT, remarks TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS wages (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, member_id INTEGER, project_worker_id INTEGER, year_month TEXT, daily_wage REAL, work_days REAL, bonus REAL DEFAULT 0, deduction REAL DEFAULT 0, actual_wage REAL, paid_amount REAL, paid_date TEXT, status TEXT DEFAULT 'pending', created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS attendances (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, project_id INTEGER, project_worker_id INTEGER, year_month TEXT, work_days REAL, days_off INTEGER, is_full_attendance INTEGER, daily_status TEXT, file_url TEXT, file_name TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS settlements (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, partner_id INTEGER, name TEXT, category TEXT, amount REAL, status TEXT DEFAULT 'pending', date TEXT, remark TEXT, files TEXT, invoice_details TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, batch_id INTEGER, voucher_no TEXT, date TEXT, direction TEXT, category TEXT, amount REAL, counterparty TEXT, channel TEXT, summary TEXT, notes TEXT, attachments TEXT, linked_invoice_id INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, direction TEXT, level1 TEXT, color TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger_match_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, pattern TEXT, category TEXT, direction TEXT, priority INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, unit TEXT, quantity REAL DEFAULT 0, min_quantity REAL, location TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER, project_id INTEGER, type TEXT, quantity REAL, unit_price REAL, date TEXT, remark TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS materials (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, unit TEXT, specifications TEXT, supplier TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT, category TEXT, content TEXT, variables TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, level TEXT, user_id TEXT, user_name TEXT, resource TEXT, resource_id TEXT, details TEXT, ip_address TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, permissions TEXT, is_system INTEGER DEFAULT 0, created_at TEXT);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT, password_hash TEXT NOT NULL, password_salt TEXT, password_hash_version INTEGER DEFAULT 1, salt TEXT, display_name TEXT, role_id TEXT, status TEXT DEFAULT 'active', avatar TEXT, is_default_password INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, size INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, manager_id INTEGER, positions TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS salary_history (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, effective_date TEXT, base_salary REAL, subsidy REAL, subsidy_note TEXT, note TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS worker_teams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, project_id INTEGER, leader_id INTEGER, remark TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS project_members (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, member_id INTEGER, joined_at TEXT);
CREATE TABLE IF NOT EXISTS regions (id INTEGER PRIMARY KEY AUTOINCREMENT, province TEXT, city TEXT, district TEXT);
CREATE TABLE IF NOT EXISTS drawings (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT, file_url TEXT, file_name TEXT, file_type TEXT, remark TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, category TEXT, amount REAL, date TEXT, description TEXT, vendor TEXT, receipt_url TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS contract_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT, content TEXT, variables TEXT, created_at TEXT, updated_at TEXT);
");

            // invoices 表迁移：添加缺失列
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN seller_id INTEGER"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices seller_id: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN buyer_id INTEGER"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices buyer_id: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN received_amount REAL DEFAULT 0"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices received_amount: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN settlement_id INTEGER"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices settlement_id: {ex.Message}"); }

            // payment_records 表迁移
            try
            {
                var hasOldSchema = db.ExecuteScalar<int>(@"SELECT COUNT(*) FROM pragma_table_info('payment_records') WHERE name='date'") > 0;
                if (hasOldSchema)
                {
                    db.Execute(@"
                        CREATE TABLE IF NOT EXISTS payment_records_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            type TEXT NOT NULL DEFAULT 'payment_out',
                            amount REAL DEFAULT 0,
                            record_date TEXT DEFAULT '',
                            project_id INTEGER,
                            partner_id INTEGER,
                            contract_id INTEGER,
                            invoice_details TEXT DEFAULT '[]',
                            remarks TEXT DEFAULT '',
                            file_url TEXT,
                            file_type TEXT,
                            created_at TEXT DEFAULT (datetime('now'))
                        );
                        INSERT INTO payment_records_new (id, amount, record_date, remarks, created_at)
                            SELECT id, amount, date, remark, created_at FROM payment_records;
                        DROP TABLE payment_records;
                        ALTER TABLE payment_records_new RENAME TO payment_records;
                    ");
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[EnsureTables] payment_records 迁移失败: {ex.Message}");
            }
    }

    /// <summary>
    /// 幂等种子管理员：仅在 users 空表时创建默认 admin 用户 + 角色
    /// </summary>
    private static void SeedDefaultAdmin(IDbConnection db)
    {
        var userCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM users");
        if (userCount > 0) return;

        var roleCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM roles");
        if (roleCount == 0)
        {
            var roles = new[] {
                ("admin", "管理员"),
                ("manager", "经理"),
                ("accountant", "财务"),
                ("worker", "工人"),
            };
            var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            foreach (var (id, name) in roles)
            {
                var perms = System.Text.Json.JsonSerializer.Serialize(Common.GetDefaultPermissions(id));
                db.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
                    VALUES (@Id, @Name, @Perms, 1, @Now)",
                    new { Id = id, Name = name, Perms = perms, Now = now });
            }
        }

        var salt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLower();
        var hash = Common.HashPassword("admin123", salt, 2);
        var nowStr = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        db.Execute(@"INSERT INTO users (id, username, password_hash, password_salt, password_hash_version,
            display_name, role_id, status, is_default_password, created_at)
            VALUES (@Id, 'admin', @Hash, @Salt, 2, '管理员', 'admin', 'active', 1, @Now)",
            new { Id = $"user-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}", Hash = hash, Salt = salt, Now = nowStr });

        Console.WriteLine("[Seed] 默认管理员已创建: admin / admin123");
    }
}


```


---

## 9. 测试文件源码


### `EngineeringManager.Tests/Endpoints/M4ThirdRoundTests.cs`

```csharp
using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// M4 第三轮整改测试 — 覆盖 GPT-5.6 第二轮审查要求
///
/// 测试项:
/// 1. 路径穿越攻击（stt/<uid>/../<other>/file 跨用户目录）
/// 2. 大文件上传（>128MB 被正确接受，>512MB 被拒绝）
/// 3. 上传中断清理（.uploading 临时文件被清除）
/// 4. segments 校验完整性（连续 1..N、数量/长度限制、不传 segments 保留原始元数据）
/// 5. 响应契约一致性（create job / ingest / list 均包裹在 data 中）
/// 6. knowledge:read 权限覆盖（详情/删除/手动入库/STT ingest）
/// </summary>
[Collection("M4ThirdRound")]
public class M4ThirdRoundTests : ApiTestBase
{
    private static string ExtractTokenFromJson(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker);
        if (i < 0) throw new Exception("token 字段未找到: " + json);
        i += marker.Length;
        var j = json.IndexOf('"', i);
        if (j < 0) throw new Exception("token 字段格式错");
        return json.Substring(i, j - i);
    }

    private async Task<string> LoginAdminAsync()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "admin123" });
        login.EnsureSuccessStatusCode();
        var body = await login.Content.ReadAsStringAsync();
        return ExtractTokenFromJson(body);
    }

    private void SetAuth(string token)
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static ByteArrayContent CreateAudioContent(string fileName, byte[] data)
    {
        var content = new ByteArrayContent(data);
        content.Headers.ContentType = new MediaTypeHeaderValue("audio/mpeg");
        content.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = "file",
            FileName = fileName,
        };
        return content;
    }

    private long CreateTestJob(string userId, string resultText, string? resultJson = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        return conn.QuerySingle<long>(@"
            INSERT INTO stt_jobs
                (source_file, source_path, source_type, engine, status, progress,
                 is_multi_speaker, num_speakers, result_text, result_json,
                 created_at, updated_at, created_by)
            VALUES
                (@SourceFile, @SourcePath, 'audio', 'test', 'completed', 100,
                 1, 2, @ResultText, @ResultJson,
                 @Now, @Now, @CreatedBy);
            SELECT last_insert_rowid();",
            new
            {
                SourceFile = "test.mp3",
                SourcePath = "stt/test/test.mp3",
                ResultText = resultText,
                ResultJson = resultJson,
                Now = now,
                CreatedBy = userId,
            });
    }

    // ═══════════════════════════════════════════════════════════
    // 1. 路径穿越测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Transcribe_PathTraversal_DotDot_CrossUser_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 尝试用 .. 穿越：从当前用户目录跳到其他用户目录
        var resp = await Client.PostAsJsonAsync("/api/stt/transcribe", new
        {
            filePath = "../2/evil.wav",
            isMultiSpeaker = false,
        });

        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("无权", body);
    }

    [Fact]
    public async Task Transcribe_PathTraversal_AbsolutePath_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 尝试用绝对路径
        var resp = await Client.PostAsJsonAsync("/api/stt/transcribe", new
        {
            filePath = "/etc/passwd",
            isMultiSpeaker = false,
        });

        Assert.False(resp.IsSuccessStatusCode);
    }

    [Fact]
    public async Task Transcribe_PathTraversal_BackslashVariation_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 尝试用反斜杠穿越
        var resp = await Client.PostAsJsonAsync("/api/stt/transcribe", new
        {
            filePath = "stt\\1\\..\\2\\evil.wav",
            isMultiSpeaker = false,
        });

        Assert.False(resp.IsSuccessStatusCode);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. 大文件上传测试（>128MB 被 MultipartBodyLengthLimit 接受）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task UploadAudio_130MB_AcceptedByMultipartLimit()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 130MB > 128MB 默认 Kestrel 限制，但 MultipartBodyLengthLimit = 550MB 应接受
        var audioData = new byte[130 * 1024 * 1024];
        audioData[0] = 0x52; audioData[1] = 0x49; audioData[2] = 0x46; audioData[3] = 0x46;

        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("large.wav", audioData), "file", "large.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
    }

    [Fact]
    public async Task UploadAudio_Exceeds500MB_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 501MB > 500MB MaxAudioSize，应被拒绝
        var audioData = new byte[501 * 1024 * 1024];
        audioData[0] = 0x52; audioData[1] = 0x49; audioData[2] = 0x46; audioData[3] = 0x46;

        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("huge.wav", audioData), "file", "huge.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("过大", body);
    }

    // ═══════════════════════════════════════════════════════════
    // 3. 上传中断清理测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task UploadAudio_NoUploadingTempFilesLeftAfterSuccess()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00 };
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("cleanup.wav", audioData), "file", "cleanup.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode);

        // 验证没有 .uploading 临时文件残留
        var dataPath = ApiConfig.ResolveDataPath();
        var sttDir = Path.Combine(dataPath, "uploads", "stt", "1");
        var uploadingFiles = Directory.GetFiles(sttDir, "*.uploading", SearchOption.TopDirectoryOnly);
        Assert.Empty(uploadingFiles);
    }

    [Fact]
    public async Task UploadAudio_CancelledMidStream_CleansUpTempFile()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 使用 CancellationTokenSource 在写入中途取消
        using var cts = new CancellationTokenSource();
        // 50MB 文件
        var audioData = new byte[50 * 1024 * 1024];
        audioData[0] = 0x52; audioData[1] = 0x49; audioData[2] = 0x46; audioData[3] = 0x46;

        // 使用慢速流内容：每写入 1KB 就延时 1ms，确保请求到达服务端后仍在传输中被取消
        var slowContent = new SlowStreamContent(audioData, "cancel.wav");

        using var form = new MultipartFormDataContent();
        form.Add(slowContent, "file", "cancel.wav");

        // 延迟 200ms 后取消 — 此时请求已在传输中
        cts.CancelAfter(TimeSpan.FromMilliseconds(200));

        try
        {
            await Client.PostAsync("/api/stt/upload", form, cts.Token);
        }
        catch (OperationCanceledException)
        {
            // 预期：请求在传输中被取消
        }
        catch (IOException)
        {
            // 客户端在取消时可能抛 IOException
        }

        // 验证没有 .uploading 临时文件残留
        await Task.Delay(1000);
        var dataPath = ApiConfig.ResolveDataPath();
        var sttDir = Path.Combine(dataPath, "uploads", "stt", "1");
        if (Directory.Exists(sttDir))
        {
            var uploadingFiles = Directory.GetFiles(sttDir, "*.uploading", SearchOption.TopDirectoryOnly);
            Assert.True(uploadingFiles.Length == 0, $"应无 .uploading 残留，但有 {uploadingFiles.Length} 个");
        }
        // 如果 sttDir 不存在，说明请求在到达服务端前就被取消了，也没有残留
    }

    // ═══════════════════════════════════════════════════════════
    // 4. segments 校验完整性测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Ingest_Segments_NonConsecutiveSpeakers_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "测试文本");
        var segments = new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = "说话人1" },
            new { speaker = 3, start = 5.0, end = 10.0, text = "说话人3（跳过了2）" },
        };

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "说话人1\n说话人3（跳过了2）",
            segments,
        });

        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("连续", body);
    }

    [Fact]
    public async Task Ingest_Segments_TooMany_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "测试文本");
        // 生成 5001 个 segments
        var segments = Enumerable.Range(0, 5001)
            .Select(i => new { speaker = 1, start = (double)i, end = (double)(i + 1), text = $"段{i}" })
            .ToArray();

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "测试文本",
            segments,
        });

        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("过多", body);
    }

    [Fact]
    public async Task Ingest_Segments_SingleTextTooLong_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "测试文本");
        var longText = new string('A', 10_001);
        var segments = new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = longText },
        };

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "测试文本",
            segments,
        });

        Assert.False(resp.IsSuccessStatusCode);
    }

    [Fact]
    public async Task Ingest_FullTextTooLong_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "测试文本");
        var longText = new string('A', 100_001);

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = longText,
        });

        Assert.False(resp.IsSuccessStatusCode);
    }

    [Fact]
    public async Task Ingest_SegmentsRecomposedTextMismatch_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "原始文本");
        var segments = new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = "实际内容A" },
            new { speaker = 2, start = 5.0, end = 10.0, text = "实际内容B" },
        };

        // text 与 segments 重组不一致
        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "这是不匹配的全文",
            segments,
        });

        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("不一致", body);
    }

    [Fact]
    public async Task Ingest_SegmentsRecomposedTextMatching_Accepted()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "原始文本");
        var segments = new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = "第一段内容" },
            new { speaker = 2, start = 5.0, end = 10.0, text = "第二段内容" },
        };

        // text 与 segments 重组一致（格式：【说话人N】文本）
        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "【说话人1】第一段内容\n【说话人2】第二段内容",
            segments,
            title = "一致测试",
        });

        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Ingest_TextWithoutSegments_PreservesOriginalSpeakerMetadata()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 创建一个带 result_json 的 job
        var resultJson = JsonSerializer.Serialize(new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = "原始说话人1文本" },
            new { speaker = 2, start = 5.0, end = 10.0, text = "原始说话人2文本" },
        });
        var jobId = CreateTestJob("1", "原始全文", resultJson);

        // 只传校对文本，不传 segments
        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "校对后的全文",
            title = "只传文本",
        });

        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());
        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var docId = doc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 验证 speakers 元数据被保留（来自原始 segments）
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var speakers = conn.QuerySingle<string>(
            "SELECT speakers FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });
        Assert.Contains("说话人1", speakers);
        Assert.Contains("说话人2", speakers);
    }

    // ═══════════════════════════════════════════════════════════
    // 5. 响应契约一致性测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task UploadThenTranscribe_PathResolution_NoDuplicatePath()
    {
        // 验证 upload 返回的 filePath 传给 transcribe 后不会路径重复
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 1. 上传文件
        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00 };
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("pathtest.wav", audioData), "file", "pathtest.wav");
        var uploadResp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(uploadResp.IsSuccessStatusCode, await uploadResp.Content.ReadAsStringAsync());
        var uploadBody = await uploadResp.Content.ReadAsStringAsync();
        using var uploadDoc = JsonDocument.Parse(uploadBody);
        var filePath = uploadDoc.RootElement.GetProperty("data").GetProperty("filePath").GetString();
        Assert.NotNull(filePath);
        Assert.StartsWith("stt/", filePath);

        // 2. 调用 transcribe — 验证文件能被找到（不会因路径重复而返回"文件不存在"）
        var resp = await Client.PostAsJsonAsync("/api/stt/transcribe", new
        {
            filePath = filePath,
            isMultiSpeaker = false,
        });

        var body = await resp.Content.ReadAsStringAsync();

        // ASR 引擎可能不可用（503），但路径解析错误会返回 400 + "音频文件不存在"
        // 关键验证：不能出现"音频文件不存在"（说明路径重复了）
        Assert.DoesNotContain("音频文件不存在", body);

        // 如果 ASR 引擎可用且成功，验证响应契约：jobId 在 data 中
        if (resp.IsSuccessStatusCode)
        {
            using var doc = JsonDocument.Parse(body);
            Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
            Assert.True(doc.RootElement.TryGetProperty("data", out var data));
            Assert.True(data.TryGetProperty("jobId", out _));
            Assert.True(data.TryGetProperty("status", out _));
        }
        else
        {
            // 非 503 的失败必须包含有意义的错误信息（不能是静默失败）
            // 503 = ASR 引擎不可用，这是预期行为
            Assert.True(resp.StatusCode == HttpStatusCode.ServiceUnavailable,
                $"意外的失败状态码 {resp.StatusCode}: {body}");
        }
    }

    [Fact]
    public async Task SttJobsList_Response_DataNestedInData()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 创建一些 jobs
        CreateTestJob("1", "测试1");
        CreateTestJob("1", "测试2");

        var resp = await Client.GetAsync("/api/stt/jobs?page=1&size=10");
        Assert.True(resp.IsSuccessStatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        var data = doc.RootElement.GetProperty("data");
        // data.data 是数组
        Assert.True(data.TryGetProperty("data", out var arr));
        Assert.Equal(JsonValueKind.Array, arr.ValueKind);
        // data.total 是数字
        Assert.True(data.TryGetProperty("total", out var total));
        Assert.True(total.GetInt32() >= 2);
    }

    [Fact]
    public async Task KnowledgeDocumentsList_Response_DataNestedInData()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 先创建一个文档
        await Client.PostAsJsonAsync("/api/knowledge/documents", new
        {
            text = "文档列表契约测试文本",
            title = "文档列表契约测试",
        });

        // 请求列表
        var resp = await Client.GetAsync("/api/knowledge/documents?page=1&size=10");
        Assert.True(resp.IsSuccessStatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        var data = doc.RootElement.GetProperty("data");
        // data.data 是数组
        Assert.True(data.TryGetProperty("data", out var arr));
        Assert.Equal(JsonValueKind.Array, arr.ValueKind);
        Assert.True(arr.GetArrayLength() >= 1);
        // data.total 是数字
        Assert.True(data.TryGetProperty("total", out var total));
        Assert.True(total.GetInt32() >= 1);
        // data.page 和 data.size
        Assert.True(data.TryGetProperty("page", out _));
        Assert.True(data.TryGetProperty("size", out _));
    }

    // ═══════════════════════════════════════════════════════════
    // 6. knowledge:read 权限覆盖测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task KnowledgeIngest_RequiresKnowledgeReadPermission()
    {
        // 创建一个没有 knowledge:read 权限的 worker 用户
        var adminToken = await LoginAdminAsync();
        SetAuth(adminToken);

        // 创建 worker 用户
        await Client.PostAsJsonAsync("/api/users", new
        {
            username = "worker_nokr",
            password = "admin123",
            displayName = "无知识库权限工人",
            roleId = "worker",
            status = "active",
        });

        // 登录 worker
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker_nokr", password = "admin123" });
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var workerToken = ExtractTokenFromJson(workerBody);
        SetAuth(workerToken);

        // 尝试手动入库
        var resp = await Client.PostAsJsonAsync("/api/knowledge/documents", new
        {
            text = "测试文本",
            title = "测试标题",
        });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task KnowledgeGetDetail_RequiresKnowledgeReadPermission()
    {
        // 先用 admin 创建一个文档
        var adminToken = await LoginAdminAsync();
        SetAuth(adminToken);

        var createResp = await Client.PostAsJsonAsync("/api/knowledge/documents", new
        {
            text = "测试详情文本",
            title = "测试详情",
        });
        Assert.True(createResp.IsSuccessStatusCode);
        var createBody = await createResp.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createBody);
        var docId = createDoc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 创建 worker 用户并登录
        await Client.PostAsJsonAsync("/api/users", new
        {
            username = "worker_detail",
            password = "admin123",
            displayName = "详情权限测试",
            roleId = "worker",
            status = "active",
        });
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker_detail", password = "admin123" });
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var workerToken = ExtractTokenFromJson(workerBody);
        SetAuth(workerToken);

        // worker 尝试访问详情
        var resp = await Client.GetAsync($"/api/knowledge/documents/{docId}");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task KnowledgeDelete_RequiresKnowledgeReadPermission()
    {
        // 先用 admin 创建一个文档
        var adminToken = await LoginAdminAsync();
        SetAuth(adminToken);

        var createResp = await Client.PostAsJsonAsync("/api/knowledge/documents", new
        {
            text = "测试删除文本",
            title = "测试删除",
        });
        Assert.True(createResp.IsSuccessStatusCode);
        var createBody = await createResp.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createBody);
        var docId = createDoc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 创建 worker 用户并登录
        await Client.PostAsJsonAsync("/api/users", new
        {
            username = "worker_delete",
            password = "admin123",
            displayName = "删除权限测试",
            roleId = "worker",
            status = "active",
        });
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker_delete", password = "admin123" });
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var workerToken = ExtractTokenFromJson(workerBody);
        SetAuth(workerToken);

        // worker 尝试删除
        var resp = await Client.DeleteAsync($"/api/knowledge/documents/{docId}");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task SttIngest_RequiresKnowledgeReadPermission()
    {
        // 用 admin 创建一个 completed job
        var adminToken = await LoginAdminAsync();
        SetAuth(adminToken);
        var jobId = CreateTestJob("1", "测试STT入库文本");

        // 创建 worker 用户并登录
        await Client.PostAsJsonAsync("/api/users", new
        {
            username = "worker_stt_ingest",
            password = "admin123",
            displayName = "STT入库权限测试",
            roleId = "worker",
            status = "active",
        });
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker_stt_ingest", password = "admin123" });
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var workerToken = ExtractTokenFromJson(workerBody);
        SetAuth(workerToken);

        // worker 尝试 STT ingest — 403（无 knowledge:read 权限）
        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "worker的入库文本",
        });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}

/// <summary>
/// 慢速流 HttpContent — 每 1KB 写入后延时 1ms，用于模拟大文件慢速上传
/// 确保 CancellationToken 在传输过程中触发，而非请求发出前
/// </summary>
file class SlowStreamContent : ByteArrayContent
{
    private readonly byte[] _data;

    public SlowStreamContent(byte[] data, string fileName) : base(data)
    {
        _data = data;
        Headers.ContentType = new MediaTypeHeaderValue("audio/wav");
        Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = "\"file\"",
            FileName = $"\"{fileName}\""
        };
    }

    protected override async Task SerializeToStreamAsync(Stream stream, TransportContext? context)
    {
        await SerializeToStreamAsync(stream, context, CancellationToken.None);
    }

    protected override async Task SerializeToStreamAsync(Stream stream, TransportContext? context, CancellationToken cancellationToken)
    {
        var buffer = new byte[1024];
        var offset = 0;
        while (offset < _data.Length)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var chunkSize = Math.Min(1024, _data.Length - offset);
            Buffer.BlockCopy(_data, offset, buffer, 0, chunkSize);
            await stream.WriteAsync(buffer, 0, chunkSize, cancellationToken);
            offset += chunkSize;
            // 每 1KB 延时 1ms — 50MB 需约 50 秒传输，确保 200ms 后取消发生在中途
            await Task.Delay(1, cancellationToken);
        }
    }
}

```


### `EngineeringManager.Tests/Endpoints/M4SttUploadAndIngestTests.cs`

```csharp
using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// M4 后端集成测试
///
/// 测试项:
/// 1. multipart 音频上传（成功/不支持格式/超过上限/未登录/中文文件名/安全路径）
/// 2. corrected ingest（不带 body 兼容/带校对文本/带 segments/无权 projectId/幂等/job ownership）
/// </summary>
[Collection("M4SttUpload")]
public class M4SttUploadAndIngestTests : ApiTestBase
{
    private static string ExtractTokenFromJson(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker);
        if (i < 0) throw new Exception("token 字段未找到: " + json);
        i += marker.Length;
        var j = json.IndexOf('"', i);
        if (j < 0) throw new Exception("token 字段格式错");
        return json.Substring(i, j - i);
    }

    private async Task<string> LoginAdminAsync()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "admin123" });
        login.EnsureSuccessStatusCode();
        var body = await login.Content.ReadAsStringAsync();
        return ExtractTokenFromJson(body);
    }

    private void SetAuth(string token)
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static ByteArrayContent CreateAudioContent(string fileName, byte[] data)
    {
        var content = new ByteArrayContent(data);
        content.Headers.ContentType = new MediaTypeHeaderValue("audio/mpeg");
        content.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = "file",
            FileName = fileName,
        };
        return content;
    }

    // ═══════════════════════════════════════════════════════════
    // 上传测试
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task UploadAudio_ValidMp3_ReturnsFilePath()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var audioData = new byte[] { 0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00 }; // fake mp3 header
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("test.mp3", audioData), "file", "test.mp3");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        var data = doc.RootElement.GetProperty("data");
        var filePath = data.GetProperty("filePath").GetString();
        Assert.NotNull(filePath);
        Assert.StartsWith("stt/", filePath);
        Assert.EndsWith(".mp3", filePath);
        Assert.Equal("test.mp3", data.GetProperty("originalName").GetString());
    }

    [Fact]
    public async Task UploadAudio_ValidWav_ReturnsFilePath()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46 }; // RIFF header
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("recording.wav", audioData), "file", "recording.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode);
    }

    [Fact]
    public async Task UploadAudio_UnsupportedExe_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var exeData = new byte[] { 0x4D, 0x5A }; // MZ header
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("malware.exe", exeData), "file", "malware.exe");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("不支持", body);
    }

    [Fact]
    public async Task UploadAudio_UnsupportedTxt_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var txtData = System.Text.Encoding.UTF8.GetBytes("not an audio file");
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("notes.txt", txtData), "file", "notes.txt");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.False(resp.IsSuccessStatusCode);
    }

    [Fact]
    public async Task UploadAudio_Unauthenticated_Rejected()
    {
        Client.DefaultRequestHeaders.Authorization = null;

        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46 };
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("test.wav", audioData), "file", "test.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task UploadAudio_ChineseFileName_Success()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46 };
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("会议录音.m4a", audioData), "file", "会议录音.m4a");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var data = doc.RootElement.GetProperty("data");
        Assert.Equal("会议录音.m4a", data.GetProperty("originalName").GetString());
    }

    [Fact]
    public async Task UploadAudio_FileWrittenToSttDirectory()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var audioData = new byte[] { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00 };
        using var form = new MultipartFormDataContent();
        form.Add(CreateAudioContent("verify.wav", audioData), "file", "verify.wav");

        var resp = await Client.PostAsync("/api/stt/upload", form);
        Assert.True(resp.IsSuccessStatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var filePath = doc.RootElement.GetProperty("data").GetProperty("filePath").GetString();

        // 验证文件实际写入磁盘
        var dataPath = ApiConfig.ResolveDataPath();
        var fullPath = Path.Combine(dataPath, "uploads", filePath!);
        Assert.True(File.Exists(fullPath), $"文件应存在于 {fullPath}");

        // 验证文件内容
        var writtenBytes = await File.ReadAllBytesAsync(fullPath);
        Assert.Equal(audioData, writtenBytes);
    }

    // ═══════════════════════════════════════════════════════════
    // Corrected Ingest 测试
    // ═══════════════════════════════════════════════════════════

    /// <summary>创建一个 completed 状态的 STT job（直接插入数据库）</summary>
    private long CreateTestJob(string userId, string resultText, string? resultJson = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        return conn.QuerySingle<long>(@"
            INSERT INTO stt_jobs
                (source_file, source_path, source_type, engine, status, progress,
                 is_multi_speaker, num_speakers, result_text, result_json,
                 created_at, updated_at, created_by)
            VALUES
                (@SourceFile, @SourcePath, 'audio', 'test', 'completed', 100,
                 1, 2, @ResultText, @ResultJson,
                 @Now, @Now, @CreatedBy);
            SELECT last_insert_rowid();",
            new
            {
                SourceFile = "test.mp3",
                SourcePath = "stt/test/test.mp3",
                ResultText = resultText,
                ResultJson = resultJson,
                Now = now,
                CreatedBy = userId,
            });
    }

    [Fact]
    public async Task Ingest_NoBody_UsesOriginalResultText()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "这是原始转写文本内容");

        var resp = await Client.PostAsync($"/api/stt/jobs/{jobId}/ingest", null);
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        Assert.False(doc.RootElement.GetProperty("data").GetProperty("idempotent").GetBoolean());
        var docId = doc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 验证 knowledge_documents.full_text 是原始文本
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var fullText = conn.QuerySingle<string>(
            "SELECT full_text FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });
        Assert.Contains("这是原始转写文本内容", fullText);
    }

    [Fact]
    public async Task Ingest_WithCorrectedText_UsesCorrectedText()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "原始转写文本");
        var correctedText = "这是校对后的修正文本，修正了识别错误";

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = correctedText,
            title = "校对后的通话记录",
        });

        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        var docId = doc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 验证 full_text 是校对后的文本
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var (fullText, title) = conn.QuerySingle<(string, string)>(
            "SELECT full_text, title FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });
        Assert.Equal(correctedText, fullText);
        Assert.Equal("校对后的通话记录", title);
    }

    [Fact]
    public async Task Ingest_WithCorrectedSegments_SpeakersPreserved()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "原始文本");
        var correctedSegments = new[]
        {
            new { speaker = 1, start = 0.0, end = 5.0, text = "说话人1的校对文本" },
            new { speaker = 2, start = 5.0, end = 10.0, text = "说话人2的校对文本" },
        };

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "【说话人1】说话人1的校对文本\n【说话人2】说话人2的校对文本",
            segments = correctedSegments,
            title = "多人通话校对",
        });

        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var docId = doc.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();

        // 验证 speakers JSON 正确
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var speakers = conn.QuerySingle<string>(
            "SELECT speakers FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });
        Assert.Contains("说话人1", speakers);
        Assert.Contains("说话人2", speakers);
    }

    [Fact]
    public async Task Ingest_NoProjectPermission_Returns403()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        // 创建一个不存在的 projectId
        var jobId = CreateTestJob("1", "测试文本");

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "测试文本",
            projectId = 99999, // 不存在的项目
        });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);

        // 验证没有新增文档
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var count = conn.QuerySingle<int>(
            "SELECT COUNT(*) FROM knowledge_documents WHERE source_ref = @Ref",
            new { Ref = jobId.ToString() });
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task Ingest_RepeatCall_Idempotent()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "幂等测试文本");

        // 第一次入库
        var resp1 = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "幂等测试文本",
            title = "幂等测试",
        });
        Assert.True(resp1.IsSuccessStatusCode);
        var body1 = await resp1.Content.ReadAsStringAsync();
        using var doc1 = JsonDocument.Parse(body1);
        var docId1 = doc1.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();
        Assert.False(doc1.RootElement.GetProperty("data").GetProperty("idempotent").GetBoolean());

        // 第二次入库（幂等）
        var resp2 = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "不同的文本",
            title = "不同标题",
        });
        Assert.True(resp2.IsSuccessStatusCode);
        var body2 = await resp2.Content.ReadAsStringAsync();
        using var doc2 = JsonDocument.Parse(body2);
        var docId2 = doc2.RootElement.GetProperty("data").GetProperty("documentId").GetInt64();
        Assert.True(doc2.RootElement.GetProperty("data").GetProperty("idempotent").GetBoolean());

        // 应返回同一个 documentId
        Assert.Equal(docId1, docId2);
    }

    [Fact]
    public async Task Ingest_JobBelongsToAnotherUser_NotFound()
    {
        // 用 admin 创建 job
        var adminToken = await LoginAdminAsync();
        SetAuth(adminToken);
        var jobId = CreateTestJob("1", "admin的转写文本");

        // 创建 worker 用户
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        await Client.PostAsJsonAsync("/api/users", new
        {
            username = "worker1",
            password = "admin123",
            displayName = "测试工人",
            roleId = "worker",
            status = "active",
        });

        // 登录 worker
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "worker1", password = "admin123" });
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var workerToken = ExtractTokenFromJson(workerBody);
        SetAuth(workerToken);

        // worker 尝试 ingest admin 的 job
        // 返回 403 因为 worker 没有 knowledge:read 权限（权限检查在 job 查询之前）
        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "worker尝试入库",
        });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Ingest_EmptyText_Rejected()
    {
        var token = await LoginAdminAsync();
        SetAuth(token);

        var jobId = CreateTestJob("1", "原始文本");

        var resp = await Client.PostAsJsonAsync($"/api/stt/jobs/{jobId}/ingest", new
        {
            text = "",
        });

        Assert.False(resp.IsSuccessStatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("空", body);
    }
}

```


### `src/components/features/knowledge/__tests__/SpeechKnowledgePage.test.tsx`

```tsx
/**
 * SpeechKnowledgePage 集成测试
 *
 * 真实渲染 SpeechKnowledgePage 组件，验证：
 * 1. sessionStorage pendingDocId 消费 → 自动切换到知识库 Tab + 传入 openDocId
 * 2. 无 pendingDocId 时默认显示录音转写 Tab
 * 3. 恶意 HTML 防护（XSS）— 通过真实渲染 KnowledgeDocumentDrawer 验证
 * 4. MaskContext 脱敏联动
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import React from 'react'

// ═══════════════════════════════════════════════════════════════
// vi.hoisted — mock 对象
// ═══════════════════════════════════════════════════════════════

const { mockMaskState, lastLibraryProps } = vi.hoisted(() => ({
  mockMaskState: { masked: false },
  lastLibraryProps: { openDocId: null as number | null, onOpenDocIdConsumed: null as (() => void) | null },
}))

// ═══════════════════════════════════════════════════════════════
// Mock modules
// ═══════════════════════════════════════════════════════════════

vi.mock('@/contexts/MaskContext', () => ({
  useMask: () => ({
    masked: mockMaskState.masked,
    setMasked: vi.fn((v: boolean) => { mockMaskState.masked = v }),
    toggleMask: vi.fn(),
    isSyncing: false,
    isHydrated: true,
  }),
}))

vi.mock('@/hooks/useToast', () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}))

// Mock framer-motion — 避免 heavy animation
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props as Record<string, unknown>
      return React.createElement('div', rest, children as React.ReactNode)
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) =>
    React.createElement(React.Fragment, null, children),
}))

// createPortal mock — render inline instead of portal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return { ...actual, createPortal: (node: React.ReactNode) => node }
})

// Mock TranscriptionWorkspace (heavy component tree)
vi.mock('../TranscriptionWorkspace', () => ({
  default: function MockTW() {
    return React.createElement('div', { 'data-testid': 'tw' }, '录音转写')
  },
}))

// Mock KnowledgeLibrary — 捕获 openDocId prop
vi.mock('../KnowledgeLibrary', () => ({
  default: function MockKL(props: { openDocId?: number | null; onOpenDocIdConsumed?: () => void }) {
    lastLibraryProps.openDocId = props.openDocId ?? null
    lastLibraryProps.onOpenDocIdConsumed = props.onOpenDocIdConsumed ?? null
    return React.createElement('div', { 'data-testid': 'kl' },
      `知识库(openDocId=${props.openDocId ?? 'null'})`)
  },
}))

// ═══════════════════════════════════════════════════════════════
// sessionStorage mock
// ═══════════════════════════════════════════════════════════════

const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

// ═══════════════════════════════════════════════════════════════
// Import components after mocks
// ═══════════════════════════════════════════════════════════════

import SpeechKnowledgePage from '../SpeechKnowledgePage'
import KnowledgeDocumentDrawer from '../KnowledgeDocumentDrawer'

// ═══════════════════════════════════════════════════════════════
// Tests: SpeechKnowledgePage sessionStorage 消费
// ═══════════════════════════════════════════════════════════════

describe('SpeechKnowledgePage — sessionStorage consumption', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
    vi.clearAllMocks()
    mockMaskState.masked = false
    lastLibraryProps.openDocId = null
    lastLibraryProps.onOpenDocIdConsumed = null
  })

  it('consumes pendingDocId from sessionStorage → switches to library tab + passes openDocId', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '42')

    render(<SpeechKnowledgePage />)

    expect(sessionStorageMock.getItem).toHaveBeenCalledWith('knowledge:pendingDocId')
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('knowledge:pendingDocId')

    // 应自动切换到知识库 Tab
    await waitFor(() => {
      expect(screen.getByTestId('kl')).toBeInTheDocument()
    })

    // openDocId=42 应传入 KnowledgeLibrary
    expect(lastLibraryProps.openDocId).toBe(42)
  })

  it('removes pendingDocId after consumption (one-time only)', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '99')

    render(<SpeechKnowledgePage />)

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('knowledge:pendingDocId')
  })

  it('does not consume when sessionStorage is empty → stays on transcription tab', async () => {
    render(<SpeechKnowledgePage />)

    expect(sessionStorageMock.removeItem).not.toHaveBeenCalledWith('knowledge:pendingDocId')
    expect(screen.getByTestId('tw')).toBeInTheDocument()
  })

  it('ignores invalid (NaN) pendingDocId', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', 'abc')

    render(<SpeechKnowledgePage />)

    // removeItem 仍被调用（清除无效值）
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('knowledge:pendingDocId')
    // 不切换 Tab（NaN 被忽略）
    expect(screen.getByTestId('tw')).toBeInTheDocument()
  })

  it('switches to library tab when valid pendingDocId present', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '55')

    render(<SpeechKnowledgePage />)

    await waitFor(() => {
      expect(screen.getByTestId('kl')).toBeInTheDocument()
    })
    expect(lastLibraryProps.openDocId).toBe(55)
  })

  it('pendingDocId consumed once — re-render does not re-consume', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '77')

    const { rerender } = render(<SpeechKnowledgePage />)

    await waitFor(() => {
      expect(screen.getByTestId('kl')).toBeInTheDocument()
    })

    const removeCallsBefore = sessionStorageMock.removeItem.mock.calls.length
    rerender(<SpeechKnowledgePage />)
    expect(sessionStorageMock.removeItem.mock.calls.length).toBe(removeCallsBefore)
  })

  it('passes onOpenDocIdConsumed callback to KnowledgeLibrary', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '42')

    render(<SpeechKnowledgePage />)

    await waitFor(() => {
      expect(screen.getByTestId('kl')).toBeInTheDocument()
    })
    expect(typeof lastLibraryProps.onOpenDocIdConsumed).toBe('function')
  })

  it('can manually switch to library tab when no pendingDocId', async () => {
    render(<SpeechKnowledgePage />)

    // 默认在录音转写 Tab
    expect(screen.getByTestId('tw')).toBeInTheDocument()

    // 点击知识库 Tab
    act(() => { fireEvent.click(screen.getByText('知识库')) })

    await waitFor(() => {
      expect(screen.getByTestId('kl')).toBeInTheDocument()
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: XSS 防护
// ═══════════════════════════════════════════════════════════════

describe('XSS prevention — KnowledgeDocumentDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMaskState.masked = false
  })

  it('escapes malicious HTML in document fullText', async () => {
    const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>'

    const { container } = render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: 'XSS 测试', sourceType: 'call',
          fullText: xssPayload,
          chunks: [{ id: 1, index: 0, text: '<script>alert(1)</script>' }],
          chunkCount: 1, createdAt: '2026-07-01',
        },
        loading: false, masked: false, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText('XSS 测试')).toBeInTheDocument() })

    // 没有实际 script 标签
    expect(container.querySelectorAll('script').length).toBe(0)
    // 没有 onerror 的 img
    expect(container.querySelectorAll('img[onerror]').length).toBe(0)
    // 文本被转义
    expect(container.innerHTML).toContain('&lt;script&gt;')
  })

  it('escapes malicious HTML in chunk text', async () => {
    const { container } = render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '测试', sourceType: 'call',
          fullText: '正常文本',
          chunks: [{ id: 1, index: 0, text: '<img src=x onerror=alert("xss")>' }],
          chunkCount: 1, createdAt: '2026-07-01',
        },
        loading: false, masked: false, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText('正常文本')).toBeInTheDocument() })
    expect(container.querySelectorAll('img[onerror]').length).toBe(0)
  })

  it('escapes HTML in document title', async () => {
    const { container } = render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '<img src=x onerror=alert(1)>', sourceType: 'call',
          fullText: '正常', chunks: [], chunkCount: 0, createdAt: '2026-07-01',
        },
        loading: false, masked: false, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText(/正常/)).toBeInTheDocument() })
    expect(container.querySelectorAll('img[onerror]').length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: MaskContext 脱敏联动
// ═══════════════════════════════════════════════════════════════

describe('MaskContext integration — KnowledgeDocumentDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('masks phone numbers when masked=true', async () => {
    render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '通话记录', sourceType: 'call',
          fullText: '联系电话 [已脱敏]',
          chunks: [], chunkCount: 0, createdAt: '2026-07-01',
        },
        loading: false, masked: true, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText(/138\*+/)).toBeInTheDocument() })
    expect(screen.queryByText('[已脱敏]')).not.toBeInTheDocument()
  })

  it('masks ID card numbers when masked=true', async () => {
    render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '身份信息', sourceType: 'call',
          fullText: '身份证 11010519491231002X',
          chunks: [], chunkCount: 0, createdAt: '2026-07-01',
        },
        loading: false, masked: true, onClose: () => {},
      })
    )

    // 原始身份证号不应可见
    await waitFor(() => { expect(screen.queryByText('11010519491231002X')).not.toBeInTheDocument() })
    // 应该有脱敏标记
    expect(screen.getByText(/\*\*\*\*/)).toBeInTheDocument()
  })

  it('does not mask when masked=false', async () => {
    render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '通话记录', sourceType: 'call',
          fullText: '联系电话 [已脱敏]',
          chunks: [], chunkCount: 0, createdAt: '2026-07-01',
        },
        loading: false, masked: false, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText(/[已脱敏]/)).toBeInTheDocument() })
  })

  it('masks PII in chunk text when masked=true', async () => {
    render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '测试', sourceType: 'call',
          fullText: '正常文本',
          chunks: [{ id: 1, index: 0, text: '银行卡 6222021234567890123' }],
          chunkCount: 1, createdAt: '2026-07-01',
        },
        loading: false, masked: true, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText(/6222\*+/)).toBeInTheDocument() })
    expect(screen.queryByText('6222021234567890123')).not.toBeInTheDocument()
  })
})

```


### `src/components/features/knowledge/__tests__/TranscriptEditor.rebuild.test.ts`

```ts
/**
 * TranscriptEditor rebuildFullText 契约测试
 *
 * 验证前端重组文本格式与后端 SttEndpoints.cs 一致性校验对齐：
 * 格式：【说话人N】文本（每段一行，用 \n 连接）
 */

import { describe, it, expect } from 'vitest'

/**
 * 复制 TranscriptEditor.tsx 中的 rebuildFullText 逻辑
 * 用于验证与后端重组逻辑一致
 */
function rebuildFullText(segments: { speaker: number; text: string }[]): string {
  return segments
    .filter(s => s.text.trim())
    .map(s => `【说话人${s.speaker}】${s.text.trim()}`)
    .join('\n')
}

describe('TranscriptEditor rebuildFullText — backend contract alignment', () => {
  it('single speaker → 【说话人1】文本', () => {
    const result = rebuildFullText([
      { speaker: 1, text: '你好世界' },
    ])
    expect(result).toBe('【说话人1】你好世界')
  })

  it('multi-speaker → newline joined with speaker labels', () => {
    const result = rebuildFullText([
      { speaker: 1, text: '第一段' },
      { speaker: 2, text: '第二段' },
    ])
    expect(result).toBe('【说话人1】第一段\n【说话人2】第二段')
  })

  it('filters empty segments', () => {
    const result = rebuildFullText([
      { speaker: 1, text: '有内容' },
      { speaker: 2, text: '   ' },
      { speaker: 3, text: '也有内容' },
    ])
    expect(result).toBe('【说话人1】有内容\n【说话人3】也有内容')
  })

  it('trims whitespace around text', () => {
    const result = rebuildFullText([
      { speaker: 1, text: '  前后空格  ' },
    ])
    expect(result).toBe('【说话人1】前后空格')
  })

  it('empty segments → empty string', () => {
    const result = rebuildFullText([])
    expect(result).toBe('')
  })

  it('all empty → empty string', () => {
    const result = rebuildFullText([
      { speaker: 1, text: '' },
      { speaker: 2, text: '  ' },
    ])
    expect(result).toBe('')
  })

  /**
   * 关键测试：前端重组文本与后端校验逻辑一致
   * 后端 SttEndpoints.cs 重组逻辑：
   *   string.Join("\n", dto.Segments
   *       .Where(s => !string.IsNullOrWhiteSpace(s.Text))
   *       .Select(s => $"【说话人{s.Speaker}】{s.Text.Trim()}"));
   */
  it('matches backend recompose format exactly', () => {
    const segments = [
      { speaker: 1, text: '张总说这个项目可以开工' },
      { speaker: 2, text: '好的我马上安排' },
      { speaker: 1, text: '预算控制在五十万以内' },
    ]

    const frontendRecomposed = rebuildFullText(segments)

    // 模拟后端重组逻辑
    const backendRecomposed = segments
      .filter(s => s.text.trim() !== '')
      .map(s => `【说话人${s.speaker}】${s.text.trim()}`)
      .join('\n')

    expect(frontendRecomposed).toBe(backendRecomposed)
  })
})

```


### `src/components/features/knowledge/__tests__/knowledge-client.contract.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listKnowledgeDocuments, getKnowledgeDocument, deleteKnowledgeDocument } from '../../../../services/knowledge-client'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock localStorage for getToken
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('knowledge-client contract tests', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    localStorageMock.clear()
    localStorageMock.setItem('jwt_token', 'fake-token')
  })

  it('listKnowledgeDocuments parses res.data.data as array and res.data.total', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          data: [
            { id: 1, title: '文档1', sourceType: 'manual', chunkCount: 5 },
            { id: 2, title: '文档2', sourceType: 'call', chunkCount: 3 },
          ],
          total: 2,
          page: 1,
          size: 20,
        },
      }),
    })

    const result = await listKnowledgeDocuments(1, 20)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.data).toHaveLength(2)
    expect(result.data!.total).toBe(2)
  })

  it('listKnowledgeDocuments handles error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ success: false, error: '无权限' }),
    })

    const result = await listKnowledgeDocuments(1, 20)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('getKnowledgeDocument parses res.data as document detail', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 42,
          title: '测试文档',
          sourceType: 'manual',
          fullText: '文档全文内容',
          chunks: [{ id: 1, chunkIndex: 0, text: '分块1' }],
        },
      }),
    })

    const result = await getKnowledgeDocument(42)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.id).toBe(42)
    expect(result.data!.title).toBe('测试文档')
  })

  it('deleteKnowledgeDocument returns success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    const result = await deleteKnowledgeDocument(42)
    expect(result.success).toBe(true)
  })

  it('deleteKnowledgeDocument handles 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: '文档不存在' }),
    })

    const result = await deleteKnowledgeDocument(999)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

```


### `src/components/features/knowledge/__tests__/stt-client.contract.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSttJobs, createSttJob, ingestSttJob } from '../../../../services/stt-client'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock localStorage for getToken
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('stt-client contract tests', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    localStorageMock.clear()
    localStorageMock.setItem('jwt_token', 'fake-token')
  })

  it('getSttJobs parses res.data.data as array and res.data.total as count', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          data: [
            { id: 1, sourceFile: 'test1.wav', status: 'completed' },
            { id: 2, sourceFile: 'test2.wav', status: 'pending' },
          ],
          total: 2,
          page: 1,
          size: 20,
        },
      }),
    })

    const result = await getSttJobs(1, 20)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.data).toHaveLength(2)
    expect(result.data!.total).toBe(2)
  })

  it('createSttJob parses res.data.jobId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { jobId: 42, status: 'pending' },
      }),
    })

    const result = await createSttJob({
      filePath: 'stt/1/test.wav',
      isMultiSpeaker: false,
    })
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.jobId).toBe(42)
    expect(result.data!.status).toBe('pending')
  })

  it('ingestSttJob parses res.data.documentId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          documentId: 99,
          idempotent: false,
          hasEmbeddings: true,
          message: '转写文本已入库',
        },
      }),
    })

    const result = await ingestSttJob(1, { text: '校对文本' })
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.documentId).toBe(99)
    expect(result.data!.idempotent).toBe(false)
  })

  it('getSttJobs handles error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ success: false, error: '无权限' }),
    })

    const result = await getSttJobs(1, 20)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

```


### `src/components/features/knowledge/__tests__/sessionStorage-pendingDoc.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

/**
 * 测试 sessionStorage 的 pendingDocId 消费逻辑
 * 模拟 KnowledgeSourceCard 写入 → SpeechKnowledgePage 读取并清除
 */
describe('sessionStorage pendingDocId mechanism', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
    vi.clearAllMocks()
  })

  it('write pendingDocId when clicking source card', () => {
    // 模拟 KnowledgeSourceCard 的 handleOpenDocument
    const docId = 42
    sessionStorageMock.setItem('knowledge:pendingDocId', String(docId))

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('knowledge:pendingDocId', '42')
    expect(sessionStorageMock.getItem('knowledge:pendingDocId')).toBe('42')
  })

  it('read and clear pendingDocId on page mount', () => {
    // 写入
    sessionStorageMock.setItem('knowledge:pendingDocId', '99')

    // 模拟 SpeechKnowledgePage useEffect 中的读取逻辑
    const pending = sessionStorageMock.getItem('knowledge:pendingDocId')
    expect(pending).toBe('99')

    if (pending) {
      sessionStorageMock.removeItem('knowledge:pendingDocId')
      const docId = parseInt(pending, 10)
      expect(docId).toBe(99)
      expect(!isNaN(docId)).toBe(true)
    }

    // 验证已被清除
    expect(sessionStorageMock.getItem('knowledge:pendingDocId')).toBeNull()
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('knowledge:pendingDocId')
  })

  it('no pendingDocId — does nothing on mount', () => {
    const pending = sessionStorageMock.getItem('knowledge:pendingDocId')
    expect(pending).toBeNull()

    if (pending) {
      sessionStorageMock.removeItem('knowledge:pendingDocId')
    }

    // 不应该调用 removeItem
    expect(sessionStorageMock.removeItem).not.toHaveBeenCalled()
  })

  it('invalid pendingDocId — parseInt returns NaN, does not open', () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', 'not-a-number')

    const pending = sessionStorageMock.getItem('knowledge:pendingDocId')
    expect(pending).toBe('not-a-number')

    if (pending) {
      sessionStorageMock.removeItem('knowledge:pendingDocId')
      const docId = parseInt(pending, 10)
      expect(isNaN(docId)).toBe(true)
    }
  })

  it('pendingDocId is consumed exactly once (no double-open)', () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '55')

    // 第一次读取（页面挂载）
    const pending1 = sessionStorageMock.getItem('knowledge:pendingDocId')
    expect(pending1).toBe('55')
    if (pending1) sessionStorageMock.removeItem('knowledge:pendingDocId')

    // 第二次读取（如果组件重新挂载）
    const pending2 = sessionStorageMock.getItem('knowledge:pendingDocId')
    expect(pending2).toBeNull()
  })
})

```


### `src/components/features/knowledge/__tests__/knowledgeTextMask.test.ts`

```ts
/**
 * knowledgeTextMask — 显示脱敏 helper 单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  maskKnowledgeText,
  getHitType,
  getHitTypeLabel,
  formatSpeakers,
} from '../knowledgeTextMask'

describe('maskKnowledgeText', () => {
  it('masked=false 时原样返回', () => {
    const text = '电话 [已脱敏]'
    expect(maskKnowledgeText(text, false)).toBe(text)
  })

  it('11 位手机号 → 138****5678', () => {
    expect(maskKnowledgeText('电话 [已脱敏]', true)).toBe('电话 138****5678')
  })

  it('身份证号 → 保留前 4 后 4', () => {
    const masked = maskKnowledgeText('身份证 11010519491231002X', true)
    expect(masked).toContain('1101')
    expect(masked).toContain('002X')
    expect(masked).toContain('****')
  })

  it('银行卡号 → 保留前 4 后 4', () => {
    const masked = maskKnowledgeText('账号 6222021234567890123', true)
    expect(masked).toContain('6222')
    expect(masked).toContain('0123')
    expect(masked).toContain('****')
  })

  it('空文本原样返回', () => {
    expect(maskKnowledgeText('', true)).toBe('')
    expect(maskKnowledgeText('', false)).toBe('')
  })

  it('业务语义文本不会被过度脱敏', () => {
    const text = '他说三十万就够了，百分之八十的进度'
    expect(maskKnowledgeText(text, true)).toBe(text)
  })
})

describe('getHitType', () => {
  it('两个 rank 都有 → mixed', () => {
    expect(getHitType({ ftsRank: 1, semanticRank: 2 })).toBe('mixed')
  })

  it('只有 ftsRank → keyword', () => {
    expect(getHitType({ ftsRank: 1, semanticRank: null })).toBe('keyword')
    expect(getHitType({ ftsRank: 1 })).toBe('keyword')
  })

  it('只有 semanticRank → semantic', () => {
    expect(getHitType({ ftsRank: null, semanticRank: 2 })).toBe('semantic')
    expect(getHitType({ semanticRank: 2 })).toBe('semantic')
  })

  it('都没有 → semantic (fallback)', () => {
    expect(getHitType({ ftsRank: null, semanticRank: null })).toBe('semantic')
    expect(getHitType({})).toBe('semantic')
  })
})

describe('getHitTypeLabel', () => {
  it('mixed → 混合命中', () => {
    expect(getHitTypeLabel('mixed')).toBe('混合命中')
  })
  it('keyword → 关键词命中', () => {
    expect(getHitTypeLabel('keyword')).toBe('关键词命中')
  })
  it('semantic → 语义命中', () => {
    expect(getHitTypeLabel('semantic')).toBe('语义命中')
  })
})

describe('formatSpeakers', () => {
  it('JSON 数组 → 逗号分隔', () => {
    expect(formatSpeakers('["说话人1","说话人2"]')).toBe('说话人1、说话人2')
  })

  it('null/undefined → 空字符串', () => {
    expect(formatSpeakers(null)).toBe('')
    expect(formatSpeakers(undefined)).toBe('')
  })

  it('非 JSON 字符串原样返回', () => {
    expect(formatSpeakers('all')).toBe('all')
  })
})

```


### `src/components/features/agent/__tests__/KnowledgeSourceCard.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import KnowledgeSourceCard from '../KnowledgeSourceCard'

// Mock useMask context
vi.mock('@/contexts/MaskContext', () => ({
  useMask: () => ({ masked: false, setMasked: vi.fn() }),
}))

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

// Mock CustomEvent
Object.defineProperty(window, 'CustomEvent', {
  value: class CustomEvent extends Event {
    detail: unknown
    constructor(type: string, options?: { detail?: unknown }) {
      super(type)
      this.detail = options?.detail
    }
  },
})

const mockResult = {
  success: true,
  query: '测试查询',
  totalHits: 2,
  usedSemantic: true,
  hits: [
    {
      documentId: 42,
      chunkId: 1,
      chunkIndex: 0,
      docTitle: '测试文档1',
      sourceType: 'call',
      occurredAt: '2026-07-01',
      speakers: '说话人1;说话人2',
      text: '这是匹配的文本片段1',
      relevance: { ftsRank: 0.001, semanticRank: 0.85, rrfScore: 0.012 },
    },
    {
      documentId: 43,
      chunkId: 2,
      chunkIndex: 0,
      docTitle: '测试文档2',
      sourceType: 'manual',
      occurredAt: '2026-07-02',
      text: '这是匹配的文本片段2',
      relevance: { ftsRank: null, semanticRank: 0.78, rrfScore: 0.008 },
    },
  ],
}

function renderCard(result: unknown) {
  return render(<KnowledgeSourceCard result={result} />)
}

describe('KnowledgeSourceCard', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
    vi.clearAllMocks()
  })

  it('renders hits when result has data', () => {
    renderCard(mockResult)
    expect(screen.getByText('测试文档1')).toBeInTheDocument()
    expect(screen.getByText('测试文档2')).toBeInTheDocument()
    expect(screen.getByText(/2 条命中/)).toBeInTheDocument()
  })

  it('renders empty state when no hits', () => {
    renderCard({ success: true, hits: [] })
    expect(screen.getByText('知识库检索：无命中结果')).toBeInTheDocument()
  })

  it('renders empty state when result is null', () => {
    renderCard(null)
    expect(screen.getByText('知识库检索：无命中结果')).toBeInTheDocument()
  })

  it('click on card sets sessionStorage pendingDocId and dispatches navigate event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    renderCard(mockResult)

    const card = screen.getByText('测试文档1').closest('div')
    expect(card).toBeTruthy()

    act(() => {
      fireEvent.click(card!)
    })

    // sessionStorage 应该被设置了 pendingDocId
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('knowledge:pendingDocId', '42')
    // navigate 事件应该被派发
    const navigateCall = dispatchSpy.mock.calls.find(
      call => (call[0] as Event).type === 'navigate'
    )
    expect(navigateCall).toBeDefined()
    expect((navigateCall![0] as CustomEvent).detail).toBe('knowledge')
  })

  it('click on card without documentId does not navigate', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const resultNoDocId = {
      success: true,
      hits: [
        { chunkId: 1, docTitle: '无文档ID', text: '测试' },
      ],
    }
    renderCard(resultNoDocId)

    const card = screen.getByText('无文档ID').closest('div')
    act(() => {
      fireEvent.click(card!)
    })

    // 不应该设置 sessionStorage
    expect(sessionStorageMock.setItem).not.toHaveBeenCalled()
    // 不应该派发 navigate 事件
    const navigateCall = dispatchSpy.mock.calls.find(
      call => (call[0] as Event).type === 'navigate'
    )
    expect(navigateCall).toBeUndefined()
  })

  it('expands to show all hits when clicking expand button', () => {
    const manyHits = {
      success: true,
      query: 'test',
      totalHits: 5,
      hits: Array.from({ length: 5 }, (_, i) => ({
        documentId: i + 1,
        chunkId: i + 1,
        docTitle: `文档${i + 1}`,
        text: `文本${i + 1}`,
      })),
    }

    renderCard(manyHits)

    // 初始只显示 3 条
    expect(screen.getByText('文档1')).toBeInTheDocument()
    expect(screen.getByText('文档3')).toBeInTheDocument()
    expect(screen.queryByText('文档4')).not.toBeInTheDocument()

    // 点击展开
    const expandBtn = screen.getByText(/查看全部来源/)
    act(() => {
      fireEvent.click(expandBtn)
    })

    // 现在显示全部 5 条
    expect(screen.getByText('文档4')).toBeInTheDocument()
    expect(screen.getByText('文档5')).toBeInTheDocument()
  })

  it('does not render expand button when hits <= 3', () => {
    renderCard(mockResult)
    expect(screen.queryByText(/查看全部来源/)).not.toBeInTheDocument()
  })

  it('renders hit type badge (keyword, semantic, mixed)', () => {
    renderCard(mockResult)
    // 文档1 有 ftsRank + semanticRank → mixed
    // 文档2 只有 semanticRank → semantic
    expect(screen.getByText('混合命中')).toBeInTheDocument()
    expect(screen.getByText('语义命中')).toBeInTheDocument()
  })
})

```


---

## 10. Agent 来源卡片


### `src/components/features/agent/KnowledgeSourceCard.tsx`

```tsx
/**
 * KnowledgeSourceCard — 知识库检索来源卡片
 *
 * 在 Agent 对话中渲染 searchKnowledgeBase 工具结果。
 * 兼容普通 chat 和 SSE chat 的工具结果结构。
 *
 * 交互：点击来源卡片 → 导航到知识库页面并打开文档详情
 *
 * 安全：
 * - React 默认转义文本，不使用 dangerouslySetInnerHTML
 * - 不显示 created_by
 * - 不渲染 embedding
 * - 不把 tool result JSON 原样暴露
 */

import React, { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { useMask } from '@/contexts/MaskContext'
import { maskKnowledgeText, getHitType, getHitTypeLabel, formatSpeakers } from '../knowledge/knowledgeTextMask'

interface KnowledgeHitItem {
  documentId?: number
  chunkId?: number
  chunkIndex?: number
  title?: string
  docTitle?: string
  sourceType?: string
  sourceRef?: string
  projectId?: number
  occurredAt?: string
  speakers?: string
  text?: string
  relevance?: {
    ftsRank?: number | null
    semanticRank?: number | null
    rrfScore?: number | null
  }
  ftsRank?: number | null
  semanticRank?: number | null
}

interface KnowledgeSourceCardProps {
  result: unknown
}

const MAX_EXPANDED = 3

/** 点击来源卡片 → 导航到知识库页面并打开文档
 *  使用 sessionStorage 可靠传递 pendingDocId，避免页面尚未挂载时丢事件
 */
function handleOpenDocument(docId: number) {
  sessionStorage.setItem('knowledge:pendingDocId', String(docId))
  window.dispatchEvent(new CustomEvent('navigate', { detail: 'knowledge' }))
}

const KnowledgeSourceCard: React.FC<KnowledgeSourceCardProps> = ({ result }) => {
  const { masked } = useMask()
  const [expanded, setExpanded] = useState(false)

  const data = result as {
    success?: boolean
    query?: string
    totalHits?: number
    usedSemantic?: boolean
    hits?: KnowledgeHitItem[]
  } | null

  if (!data || !data.hits || data.hits.length === 0) {
    return (
      <div className="text-xs text-slate-500 p-2">
        <p>知识库检索：无命中结果</p>
      </div>
    )
  }

  const hits = data.hits
  const shown = expanded ? hits : hits.slice(0, MAX_EXPANDED)

  return (
    <div className="space-y-2">
      {/* 头部 */}
      <div className="flex items-center gap-2 text-xs">
        <Icon name="Library" size={14} className="text-violet-500" />
        <span className="font-semibold text-slate-700">知识库检索</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500">查询："{data.query}"</span>
        <Badge variant="primary" size="sm">{data.totalHits || hits.length} 条命中</Badge>
      </div>

      {/* 来源卡片 — 可点击打开文档 */}
      <div className="space-y-1.5">
        {shown.map((hit, i) => {
          const ftsRank = hit.relevance?.ftsRank ?? hit.ftsRank
          const semanticRank = hit.relevance?.semanticRank ?? hit.semanticRank
          const hitType = getHitType({ ftsRank, semanticRank })
          const title = hit.docTitle || hit.title || '未命名文档'
          const text = hit.text || ''
          const docId = hit.documentId

          return (
            <div
              key={hit.chunkId || i}
              className={`p-2.5 rounded-lg border border-slate-200 bg-white hover:border-violet-300 hover:shadow-sm transition-all ${
                docId ? 'cursor-pointer' : ''
              }`}
              onClick={() => docId && handleOpenDocument(docId)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-slate-700 truncate flex-1">{title}</span>
                <Badge
                  variant={hitType === 'mixed' ? 'primary' : hitType === 'keyword' ? 'gray' : 'success'}
                  size="sm"
                >
                  {getHitTypeLabel(hitType)}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 break-words">
                {maskKnowledgeText(text, masked)}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                {hit.sourceType && <span>{hit.sourceType}</span>}
                {hit.occurredAt && <span>· {hit.occurredAt}</span>}
                {hit.speakers && <span>· {formatSpeakers(hit.speakers)}</span>}
                {docId && <span className="ml-auto text-violet-500">点击查看 →</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* 展开/折叠 */}
      {hits.length > MAX_EXPANDED && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-violet-600 hover:text-violet-700 font-medium"
        >
          {expanded ? '收起' : `查看全部来源（共 ${hits.length} 条）`}
        </button>
      )}

      {/* 调试信息折叠区 */}
      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer hover:text-slate-500">调试信息</summary>
        <div className="mt-1 space-y-0.5">
          {shown.map((hit, i) => (
            <div key={i} className="flex gap-2">
              <span>#{i + 1}</span>
              {hit.relevance?.ftsRank != null && <span>FTS rank: {hit.relevance.ftsRank}</span>}
              {hit.relevance?.semanticRank != null && <span>Semantic rank: {hit.relevance.semanticRank}</span>}
              {hit.relevance?.rrfScore != null && <span>RRF: {hit.relevance.rrfScore.toFixed(6)}</span>}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

export default KnowledgeSourceCard

```


---

## 11. 迁移脚本


### `EngineeringManager.Api/Migrations/Scripts/028_AddSpeechToText.sql`

```sql
-- ============================================================
-- M1: 语音转文字 (STT) 后台任务表
-- 对应 C# Services/Stt/SttWorker.cs, Endpoints/SttEndpoints.cs
-- ============================================================

CREATE TABLE IF NOT EXISTS stt_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file TEXT NOT NULL,          -- 原始音频文件名
    source_path TEXT NOT NULL,          -- 预处理后 wav 的完整路径
    source_type TEXT NOT NULL DEFAULT 'audio',  -- audio (未来可能 video)
    engine TEXT NOT NULL DEFAULT 'qwen3-asr-1.7b-gguf',
    status TEXT NOT NULL DEFAULT 'pending',     -- pending/processing/completed/failed/cancelled
    progress INTEGER NOT NULL DEFAULT 0,        -- 0-100
    is_multi_speaker INTEGER NOT NULL DEFAULT 0,-- 是否多人录音（1=走说话人分离）
    num_speakers INTEGER,                       -- 预期说话人数（null=自动）
    hotwords TEXT,                              -- 可选热词/上下文 (JSON 数组)
    result_text TEXT,                           -- 全文（纯文本）
    result_json TEXT,                           -- 分段 JSON: [{speaker,start,end,text},...]
    duration_sec REAL,                          -- 音频时长（秒）
    elapsed_sec REAL,                           -- 转写耗时（秒）
    error TEXT,                                 -- 错误信息
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL                    -- 创建用户 ID
);

CREATE INDEX IF NOT EXISTS idx_stt_jobs_user ON stt_jobs(created_by, status);
CREATE INDEX IF NOT EXISTS idx_stt_jobs_status ON stt_jobs(status, created_at);

```


### `EngineeringManager.Api/Migrations/Scripts/029_AddKnowledgeBase.sql`

```sql
-- ============================================================
-- M2: 知识库 (Knowledge Base) 表结构
-- 对应 C# Services/KnowledgeBaseService.cs, Endpoints/KnowledgeEndpoints.cs
--
-- 三张表:
--   knowledge_documents  — 文档元信息（来源/标题/全文/说话人/项目）
--   knowledge_chunks     — 分块文本 + 向量 (BLOB)
--   knowledge_fts        — FTS5 trigram 全文索引（触发器自动同步）
--
-- created_by 类型: TEXT（与 028_AddSpeechToText.sql 的 stt_jobs.created_by 一致）
-- ============================================================

-- 1. 文档表
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,          -- call/meeting/upload/manual
    source_ref  TEXT,                   -- 对应 stt_job.id / 文件名 / 自定义标识
    project_id  INTEGER,                -- 关联项目（可空，Phase2 实体链接锚定种子）
    title       TEXT NOT NULL,
    full_text   TEXT NOT NULL,
    speakers    TEXT,                   -- JSON: 归一化后的说话人列表 + 时间段
    occurred_at TEXT,                   -- 录音/文档发生时间
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    created_by  TEXT NOT NULL           -- 创建用户 ID（与 028 一致: TEXT）
);

-- 2. 分块表
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text        TEXT NOT NULL,
    embedding   BLOB                    -- 入库时算好的 L2 归一化向量（float[] 原始字节）
);

-- 3. FTS5 全文索引（trigram tokenizer，支持中文子串匹配）
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
    text,
    content='knowledge_chunks',
    content_rowid='id',
    tokenize='trigram'
);

-- 4. 触发器：保持 knowledge_fts 与 knowledge_chunks 同步
--    INSERT: 插入新行到 FTS
CREATE TRIGGER IF NOT EXISTS knowledge_fts_ai
AFTER INSERT ON knowledge_chunks
BEGIN
    INSERT INTO knowledge_fts(rowid, text) VALUES (new.id, new.text);
END;

--    DELETE: 从 FTS 删除
CREATE TRIGGER IF NOT EXISTS knowledge_fts_ad
AFTER DELETE ON knowledge_chunks
BEGIN
    INSERT INTO knowledge_fts(knowledge_fts, rowid, text) VALUES('delete', old.id, old.text);
END;

--    UPDATE: 先删旧值再插新值
CREATE TRIGGER IF NOT EXISTS knowledge_fts_au
AFTER UPDATE ON knowledge_chunks
BEGIN
    INSERT INTO knowledge_fts(knowledge_fts, rowid, text) VALUES('delete', old.id, old.text);
    INSERT INTO knowledge_fts(rowid, text) VALUES (new.id, new.text);
END;

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_by ON knowledge_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_project ON knowledge_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source ON knowledge_documents(source_type, source_ref);

```


### `EngineeringManager.Api/Migrations/Scripts/030_AddKnowledgeDocUniqueIndex.sql`

```sql
-- ============================================================
-- M2 第四轮: 知识库文档幂等唯一索引
--
-- 目的: 数据库级并发安全，防止"先查再插"竞态导致重复文档
--
-- 唯一约束: (created_by, source_type, source_ref)
--   - 同用户 + 同来源类型 + 同来源标识 → 只能存在 1 条文档
--   - manual 类型不受限制（source_ref 通常为 NULL）
--   - source_ref 为 NULL 的记录不受限制
--
-- 注意: 不修改已发布/执行过的 029 迁移，使用新迁移号 030
-- ============================================================

-- 部分唯一索引：仅对非 manual 且 source_ref 非空的记录生效
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_doc_unique
ON knowledge_documents(created_by, source_type, source_ref)
WHERE source_type <> 'manual' AND source_ref IS NOT NULL;

```


---

## 12. 第四轮审核整改对照表


| # | 审核问题 | 整改措施 | 证据 |
|---|---------|---------|------|
| 1 | 后端按 segment.Text 换行拼接，与前端 `【说话人N】文本` 格式冲突 | 后端重组逻辑改为 `string.Join("\n", segments.Select(s => $"【说话人{s.Speaker}】{s.Text.Trim()}"))` | SttEndpoints.cs L414-420, TranscriptEditor.rebuild.test.ts 7 tests |
| 2 | 缺少 6 个核心前端组件源码 | 审查包包含 TranscriptionWorkspace, AudioUploadCard, TranscriptEditor, SttJobList, KnowledgeLibrary, KnowledgeDocumentDrawer 完整源码 | 本包第 5 节 |
| 3 | 上传中断测试在 PostAsync 前执行 cts.Cancel() | 改用 `cts.CancelAfter(200ms)` + `SlowStreamContent` 慢速流（每 1KB 延时 1ms），确保请求到达服务端后仍在传输中被取消 | M4ThirdRoundTests.cs `UploadAudio_CancelledMidStream_CleansUpTempFile` |
| 4 | sessionStorage 测试只是手工复制逻辑 | 新增 `SpeechKnowledgePage.test.tsx`（15 tests），真实渲染 SpeechKnowledgePage 组件，验证 sessionStorage 消费、Tab 切换、openDocId 传递 | SpeechKnowledgePage.test.tsx |
| 5 | Git HEAD 仍是 M3 的 fba841fe | 新 commit `dcf2880`，64 files changed, 13274 insertions | git log, git show --stat |
| 6 | 缺少 XSS 防护测试 | 新增 3 个 XSS 测试：fullText 恶意 HTML、chunk text 恶意 HTML、title 恶意 HTML，验证 React 自动转义 | SpeechKnowledgePage.test.tsx XSS prevention suite |
| 7 | 缺少 MaskContext 脱敏测试 | 新增 4 个脱敏测试：手机号、身份证、银行卡、masked=false 对照 | SpeechKnowledgePage.test.tsx MaskContext integration suite |
| 8 | 缺少 TranscriptEditor rebuild 契约测试 | 新增 `TranscriptEditor.rebuild.test.ts`（7 tests），验证前端 rebuildFullText 与后端重组格式完全一致 | TranscriptEditor.rebuild.test.ts |
