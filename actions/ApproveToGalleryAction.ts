import {useState} from 'react'
import {useClient, DocumentActionComponent, DocumentActionProps} from 'sanity'
import {CheckmarkCircleIcon, CloseCircleIcon} from '@sanity/icons'

export const ApproveToGalleryAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const client = useClient({apiVersion: '2024-05-16'})

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

        // Update the document to toggle the boolean
        await client
          .patch(props.id)
          .set({approvedForGallery: nextStatus})
          .commit()

        // If there's a draft, keep it in sync
        if (props.draft) {
          await client
            .patch(`drafts.${props.id}`)
            .set({approvedForGallery: nextStatus})
            .commit()
        }

        alert(`Successfully ${nextStatus ? 'approved' : 'removed'} design ${nextStatus ? 'for' : 'from'} the gallery.`)
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
