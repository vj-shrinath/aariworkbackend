import React, { useRef, useState } from 'react'
import { insert, useClient, ArrayOfObjectsInputProps } from 'sanity'
import { Button, Stack, Flex, Spinner, Text, Card } from '@sanity/ui'
import { UploadIcon } from '@sanity/icons'

// Simple content-lake random key generator (same signature as Sanity's own key generator)
const generateKey = () => Math.random().toString(36).substring(2, 14);

export function BulkUploadInput(props: ArrayOfObjectsInputProps) {
  const { onChange } = props
  const [uploadingCount, setUploadingCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Use client with apiVersion consistent with actions
  const client = useClient({ apiVersion: '2024-05-16' })

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingCount(files.length)

    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        // 1. Programmatically upload the image file to Sanity Assets
        const asset = await client.assets.upload('image', file, {
          filename: file.name
        })

        // 2. Build the array member item matching the schema structure
        return {
          _type: 'image',
          _key: generateKey(),
          asset: {
            _type: 'reference',
            _ref: asset._id
          },
          alt: file.name.split('.').slice(0, -1).join('.').replace(/[-_]+/g, ' '),
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    const validItems = results.filter((item): item is NonNullable<typeof item> => item !== null)

    if (validItems.length > 0) {
      // 3. Patch the new images into the array
      // 'after' position and [-1] path means appending to the array
      onChange(insert(validItems, 'after', [-1]))
    }

    setUploadingCount(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card border radius={2} padding={3} style={{ marginBottom: '1rem' }}>
      <Stack space={3}>
        <Flex gap={2} align="center">
          <Button
            fontSize={2}
            icon={UploadIcon}
            padding={3}
            text={uploadingCount > 0 ? `Uploading (${uploadingCount} files)...` : "Select & Upload Multiple Images"}
            tone="default"
            mode="ghost"
            onClick={handleButtonClick}
            disabled={uploadingCount > 0}
          />
          {uploadingCount > 0 && (
            <Flex gap={2} align="center">
              <Spinner />
              <Text size={1} muted>Uploading to Sanity...</Text>
            </Flex>
          )}
        </Flex>
        
        {/* Hidden multiple file input */}
        <input
          type="file"
          multiple
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Render the default Sanity array interface underneath (so drag-and-drop & editing still works perfectly!) */}
        {props.renderDefault(props)}
      </Stack>
    </Card>
  )
}
