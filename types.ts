
export interface Appointment {
  id: string;
  customerName: string;
  date: string;
  time: string;
  serviceType: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  contact: string;
}

export interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  pendingConfirmations: number;
  popularService: string;
}
