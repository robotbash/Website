import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SickCountWidgetProps {
  sickCount: number
  callOffCount: number
}

export function SickCountWidget({ sickCount, callOffCount }: SickCountWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">This Year</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold">{sickCount}</p>
            <p className="text-sm text-muted-foreground">sick day{sickCount !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{callOffCount}</p>
            <p className="text-sm text-muted-foreground">call-off{callOffCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link href="/sick" className="text-xs text-primary hover:underline mt-2 inline-block">
          Log sick day or call-off
        </Link>
      </CardContent>
    </Card>
  )
}
