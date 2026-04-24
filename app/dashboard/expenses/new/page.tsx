import { redirect } from 'next/navigation';

export default function NewExpenseRedirectPage() {
  redirect('/dashboard/expenses');
}
