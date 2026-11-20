import { CompanyForm } from "../company-form";
import { PageHeader } from "@/components/page-header";
import { createCompany } from "../actions";

export default function NewCompanyPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Nova empresa" back={{ href: "/companies", label: "Empresas" }} />
      <CompanyForm action={createCompany} cancelHref="/companies" />
    </div>
  );
}
