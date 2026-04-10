import { IPOForm } from '@/components/admin/ipo-form'

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
          Fill in the details to create a new IPO entry
        </p>
      </div>

      <IPOForm />
    </div>
  )
}
