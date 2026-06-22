export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return '只能上传 JPG、PNG 或 WebP 格式的图片'
  }
  if (file.size > 5 * 1024 * 1024) {
    return '图片大小不能超过 5MB'
  }
  return null
}

export function validateFile(file: File, maxSizeMB: number = 10): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return '只能上传 JPG、PNG、WebP 或 PDF 格式的文件'
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `文件大小不能超过 ${maxSizeMB}MB`
  }
  return null
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
