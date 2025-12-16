import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface GlossaryCardProps {
  term: string
  definition: string
  relatedTerms?: string[]
  className?: string
}

export function GlossaryCard({ term, definition, relatedTerms, className }: GlossaryCardProps) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-6", className)}>
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-900">{term}</h2>
      </div>
      <p className="mb-4 text-lg text-slate-700">{definition}</p>

      {relatedTerms && relatedTerms.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-500">Povezani pojmovi</h3>
          <div className="flex flex-wrap gap-2">
            {relatedTerms.map((relatedTerm) => (
              <Link
                key={relatedTerm}
                href={`/rjecnik/${relatedTerm.toLowerCase().replace(/\s+/g, "-")}`}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200"
              >
                {relatedTerm}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
