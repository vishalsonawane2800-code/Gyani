import { IPOForm } from '@/components/admin/ipo-form'
import { BulkDataEntry } from '@/components/admin/bulk-data-entry'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

export default function NewIPOPage() {
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white">
          Add New IPO
        </h1>
        <p className="text-slate-400 mt-1">
          Create a new IPO entry and add financial/peer/GMP data
        </p>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="basic">Basic Details</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Data (After Creating IPO)</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
            <p className="text-sm text-slate-300 flex items-start gap-2">
              <span className="text-blue-400 font-bold mt-0.5">ℹ️</span>
              <span>
                First, create the IPO with basic details. After it's created, you can add financial data, peer comparison, and GMP history using the Bulk Data tab.
              </span>
            </p>
          </div>
          <IPOForm />
        </TabsContent>

        <TabsContent value="bulk">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
            <p className="text-sm text-slate-300 flex items-start gap-2">
              <span className="text-amber-400 font-bold mt-0.5">⚠️</span>
              <span>
                Create the IPO first using the <strong>Basic Details</strong> tab. Once created, you'll be able to add financial data, peer comparisons, and GMP history.
              </span>
            </p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-8 text-center">
            <p className="text-slate-400">
              After creating an IPO, navigate to Admin → Edit IPO → and use the Bulk Data Entry section on the right sidebar.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
