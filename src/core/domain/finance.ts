export type PaymentPlanStatus = 'pending' | 'partial' | 'paid';
export type PaymentPlanType = 'contado' | 'cuotas';

export interface PaymentPlan {
    id: string;
    enrollment_id: string;
    plan_type: PaymentPlanType;
    base_amount: number;
    enrollment_fee: number;
    uniform_fee: number;
    total_amount: number;
    status: PaymentPlanStatus;
    created_at?: string;
    updated_at?: string;
}

export interface Transaction {
    id: string;
    payment_plan_id: string;
    amount_paid: number;
    payment_date: string;
    payment_method?: string | null;
    reference_code?: string | null;
    notes?: string | null;
    created_at?: string;
}
