import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatHours } from '@/lib/utils'
import { Calendar } from 'lucide-react'

interface PtoWidgetProps {
  balance: number
  annualHours: number
}

export function PtoWidget({ balance, annualHours }: PtoWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">PTO Balance</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/pto">View history</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <p className="text-3xl font-bold tabular-nums">{formatHours(balance)}</p>
            <p className="text-sm text-muted-foreground">
              of {formatHours(annualHours)} annual allowance remaining
            </p>
          </div>
        </div>
        {balance === 0 && (
          <p className="text-sm text-muted-foreground mt-3">
            No PTO hours remaining. Contact your admin to adjust your balance.
          </p>
        )}
        {balance > 0 && (
          <Button asChild className="mt-3 w-full" variant="outline">
            <Link href="/pto">Request time off</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
