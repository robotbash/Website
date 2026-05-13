import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, AlertTriangle, Edit } from 'lucide-react'

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1">
            <Link href="/pto">
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Request PTO</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1">
            <Link href="/sick">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-xs">Mark Sick Day</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1">
            <Link href="/corrections">
              <Edit className="h-5 w-5" />
              <span className="text-xs">Missed Punch</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
