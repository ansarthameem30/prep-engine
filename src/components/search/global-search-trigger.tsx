import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function GlobalSearchTrigger() {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="relative w-full"
      onClick={() => navigate('/search')}
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        readOnly
        placeholder="Search lessons… (Ctrl+K)"
        className="cursor-pointer pl-9"
      />
    </button>
  )
}
