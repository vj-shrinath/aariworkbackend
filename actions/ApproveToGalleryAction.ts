import {useState} from 'react'
import {useDocumentOperation, DocumentActionComponent, DocumentActionProps} from 'sanity'
import {CheckmarkCircleIcon, CloseCircleIcon} from '@sanity/icons'

export const ApproveToGalleryAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const {patch, publish} = useDocumentOperation(props.id, props.type)

  const isApproved = (props.published as any)?.approvedForGallery === true

  return {
    label: isProcessing 
      ? 'Processing...' 
      : isApproved 
        ? 'Remove from Gallery' 
        : 'Approve to Gallery',
    icon: isApproved ? CloseCircleIcon : CheckmarkCircleIcon,
    tone: isApproved ? 'default' : 'positive',
    disabled: isProcessing,
    onHandle: async () => {
      setIsProcessing(true)
      try {
        const nextStatus = !isApproved

        // 1. Perform patch operation in Sanity Studio context
        patch.execute([{set: {approvedForGallery: nextStatus}}])
        
        // 2. Publish changes to commit them to the live database
        publish.execute()
      } catch (error) {
        console.error('Approve/Remove error:', error)
        alert('Action failed: ' + (error as Error).message)
      } finally {
        setIsProcessing(false)
        props.onComplete()
      }
    },
  }
}
