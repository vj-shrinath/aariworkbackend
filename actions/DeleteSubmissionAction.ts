import {useState} from 'react'
import {DocumentActionComponent, DocumentActionProps} from 'sanity'
import {TrashIcon} from '@sanity/icons'

export const DeleteSubmissionAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const client = typeof (props as any).getClient === 'function'
    ? (props as any).getClient({apiVersion: '2024-05-16'})
    : (props as any).context?.getClient({apiVersion: '2024-05-16'})

  return {
    label: isDeleting ? 'Deleting...' : 'Delete Submission & Asset',
    icon: TrashIcon,
    tone: 'critical',
    disabled: isDeleting,
    onHandle: () => {
      setDialogOpen(true)
    },
    dialog: dialogOpen && {
      type: 'confirm',
      tone: 'critical',
      message: 'Are you sure you want to delete this user submission? This will also permanently delete the uploaded image asset from Sanity storage.',
      onConfirm: async () => {
        setIsDeleting(true)
        setDialogOpen(false)

        try {
          const doc = (props.published || props.draft) as any
          const assetId = doc?.image?.asset?._ref

          // 1. Delete document(s) first to remove the constraint reference
          await client
            .transaction()
            .delete(props.id)
            .delete(`drafts.${props.id}`)
            .commit()

          // 2. Delete image asset if exists
          if (assetId) {
            try {
              await client.delete(assetId)
            } catch (err) {
              console.error('Failed to delete asset (possibly referenced elsewhere):', err)
            }
          }
        } catch (error) {
          console.error('Deletion error:', error)
          alert('Failed to delete submission: ' + (error as Error).message)
        } finally {
          setIsDeleting(false)
          props.onComplete()
        }
      },
      onCancel: () => {
        setDialogOpen(false)
      },
    },
  }
}
