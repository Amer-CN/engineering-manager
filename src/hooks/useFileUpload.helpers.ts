/**
 * 生成唯一 ID
 */
export const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

/**
 * 获取文件类型
 */
export const getFileType = (file: File): 'pdf' | 'image' | 'word' | 'excel' => {
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.includes('word') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'word'
  if (file.type.includes('excel') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'excel'
  return 'image'
}

/**
 * 读取文件为 base64
 */
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 验证文件类型和大小
 */
export const validateFileType = (file: File, accept: string[], maxSizeMB: number): string | null => {
  if (accept.length > 0 && !accept.includes(file.type)) {
    const acceptNames = accept.map(type => {
      if (type.includes('jpeg')) return 'JPG'
      if (type.includes('png')) return 'PNG'
      if (type.includes('webp')) return 'WebP'
      if (type.includes('pdf')) return 'PDF'
      if (type.includes('word')) return 'Word'
      if (type.includes('excel')) return 'Excel'
      return type
    })
    return `只能上传 ${acceptNames.join('、')} 格式的文件`
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return `文件大小不能超过 ${maxSizeMB}MB`
  }

  return null
}
