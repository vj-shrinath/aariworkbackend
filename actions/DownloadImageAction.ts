import {useState} from 'react'
import {DocumentActionComponent, DocumentActionProps} from 'sanity'
import {DownloadIcon} from '@sanity/icons'

export const DownloadImageAction = (context: any): DocumentActionComponent => {
  return (props: DocumentActionProps) => {
    const [isDownloading, setIsDownloading] = useState(false)
    const client = context.getClient({apiVersion: '2024-05-16'})

    return {
      label: isDownloading ? 'Downloading...' : 'Download Full Design',
      icon: DownloadIcon,
      disabled: isDownloading,
      onHandle: async () => {
        setIsDownloading(true)
        try {
          const doc = (props.published || props.draft) as any
          const assetId = doc?.image?.asset?._ref

          if (!assetId) {
            alert('No image specified on this submission.')
            return
          }

          // Fetch asset metadata using client
          const asset = await client.getDocument(assetId)
          if (!asset || !asset.url) {
            alert('Image asset not found or has no URL.')
            return
          }

          // Download logic using Blob to force actual file download
          const response = await fetch(asset.url)
          const blob = await response.blob()
          const downloadUrl = window.URL.createObjectURL(blob)
          
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = asset.originalFilename || 'user-design.jpg'
          document.body.appendChild(link)
          link.click()
          link.remove()
          
          window.URL.revokeObjectURL(downloadUrl)
        } catch (error) {
          console.error('Download error:', error)
          alert('Failed to download image: ' + (error as Error).message)
        } finally {
          setIsDownloading(false)
          props.onComplete()
        }
      },
    }
  }
}
