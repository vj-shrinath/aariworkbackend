import {useState} from 'react'
import {useClient, useDocumentOperation, DocumentActionComponent, DocumentActionProps} from 'sanity'
import {CheckmarkCircleIcon, CloseCircleIcon} from '@sanity/icons'

export const ApproveToGalleryAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const client = useClient({apiVersion: '2024-05-16'})
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
        const doc = (props.published || props.draft) as any
        const docId = `galleryDesign-${props.id}`

        if (nextStatus) {
          // If approving, check if image exists
          const imageAsset = doc?.image
          if (!imageAsset) {
            alert('No image specified on this submission to approve.')
            setIsProcessing(false)
            return
          }

          // Create the gallery design template document
          await client.createIfNotExists({
            _id: docId,
            _type: 'galleryDesign',
            title: doc.title || `User Upload - ${new Date(doc.uploadDate || doc._createdAt || Date.now()).toLocaleDateString()}`,
            mainImage: imageAsset,
            publishedAt: doc.uploadDate || new Date().toISOString(),
          })
          
          alert('Submission approved! A Gallery Design Template has been created. You can now edit its details under "Gallery Design Templates".')
        } else {
          // If removing, delete the gallery design template (both draft and published versions)
          const confirmRemove = window.confirm(
            'Are you sure you want to remove this from the gallery? This will permanently delete the corresponding Gallery Design Template and any edits you made to it.'
          )
          if (!confirmRemove) {
            setIsProcessing(false)
            return
          }

          await client
            .transaction()
            .delete(docId)
            .delete(`drafts.${docId}`)
            .commit()
        }

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

