import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, FileText, Scale, Calendar, CreditCard, BarChart3 } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Besplatni alati za poslovanje | FiskAI",
  description:
    "Besplatni kalkulatori i alati za hrvatske poduzetnike - doprinosi, porezi, uplatnice i više.",
}

const tools = [
  {
    slug: "kalkulator-doprinosa",
    title: "Kalkulator doprinosa",
    description: "Izračunajte mjesečne doprinose za MIO i HZZO",
    icon: Calculator,
  },
  {
    slug: "kalkulator-poreza",
    title: "Kalkulator poreza",
    description: "Izračunajte paušalni porez na temelju prihoda",
    icon: BarChart3,
  },
  {
    slug: "pdv-prag-kalkulator",
    title: "PDV prag kalkulator",
    description: "Pratite koliko ste blizu PDV praga od 60.000 EUR",
    icon: Scale,
  },
  {
    slug: "generator-uplatnica",
    title: "Generator uplatnica",
    description: "Generirajte Hub3 barkod za uplate doprinosa",
    icon: CreditCard,
  },
  {
    slug: "usporedba-oblika",
    title: "Usporedba oblika",
    description: "Usporedite paušalni obrt, obrt na dohodak i d.o.o.",
    icon: FileText,
  },
  {
    slug: "kalendar-rokova",
    title: "Kalendar rokova",
    description: "Sve važne datume za plaćanje na jednom mjestu",
    icon: Calendar,
  },
]

export default function ToolsIndexPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Besplatni alati</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Kalkulatori i pomoćni alati za hrvatske poduzetnike. Potpuno besplatno, bez registracije.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.slug} href={`/alati/${tool.slug}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <tool.icon className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>{tool.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{tool.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
