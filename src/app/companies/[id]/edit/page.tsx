import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CompanyForm } from "../../company-form";
import { updateCompany } from "../../actions";

export default async function EditCompanyPage({ params }: PageProps<"/companies/[id]/edit">) {
  const { id } = await params;
  const company = await db.company.findUnique({ where: { id } });
  if (!company) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Editar {company.name}</h1>
      <CompanyForm action={updateCompany.bind(null, id)} company={company} cancelHref={`/companies/${id}`} />
    </div>
  );
}
