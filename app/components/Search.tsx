import React from 'react'
import { Space, Input, Button } from 'antd'
export default function Search(){
  const [searchLoading, setSearchLoading] = React.useState(false)
  const search = () => {
    setSearchLoading(true)
    setTimeout(() => {
      setSearchLoading(false)
    }, 2000)
  }
  return <Space.Compact style={{ width: '100%' }}>
  <Input defaultValue="https://cloudvil.com" onPressEnter={() => search()}/>
  <Button type="primary" loading={searchLoading} onClick={() => search()}>Search</Button>
</Space.Compact>
}
