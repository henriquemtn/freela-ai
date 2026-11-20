import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { CompanyForm } from "../../company-form";
import { updateCompany } from "../../actions";

export default async function EditCompanyPage({ params }: PageProps<"/companies/[id]/edit">) {
  const { id } = await params;
  const company = await db.company.findUnique({ where: { id } });
  if (!company) notFound();
  return (
    <div className="space-y-8">
      <PageHeader title={`Editar ${company.name}`} back={{ href: `/companies/${id}`, label: company.name }} />
      <CompanyForm action={updateCompany.bind(null, id)} company={company} cancelHref={`/companies/${id}`} />
    </div>
  );
}
