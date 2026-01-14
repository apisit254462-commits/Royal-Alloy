
import React from 'react';
import { Appointment } from '../types';
import { Icons } from '../constants';

interface AppointmentCardProps {
  appointment: Appointment;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg text-slate-800">{appointment.customerName}</h3>
          <p className="text-sm text-slate-500">{appointment.contact}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
          {appointment.status}
        </span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center text-sm text-slate-600">
          <span className="mr-3 text-indigo-500"><Icons.Calendar /></span>
          {appointment.date}
        </div>
        <div className="flex items-center text-sm text-slate-600">
          <span className="mr-3 text-indigo-500"><Icons.Clock /></span>
          {appointment.time}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-50">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service</span>
          <p className="text-sm font-medium text-slate-700 mt-1">{appointment.serviceType}</p>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;
