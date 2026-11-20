import { CompanyForm } from "../company-form";
import { createCompany } from "../actions";

export default function NewCompanyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nova empresa</h1>
      <CompanyForm action={createCompany} cancelHref="/companies" />
    </div>
  );
}
