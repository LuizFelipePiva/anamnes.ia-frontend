import React from 'react';

interface PageNavigatorCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  gradient: string;
}

const PageNavigatorCard: React.FC<PageNavigatorCardProps> = ({ title, description, icon, onClick, gradient }) => (
  <div
    onClick={onClick}
    className="flex-1 cursor-pointer bg-gray-50 rounded-2xl shadow-xl p-8 flex flex-col justify-center items-center text-center transition-transform hover:scale-105 hover:shadow-2xl group"
  >
    <div className={`mb-4 w-16 h-16 flex items-center justify-center rounded-full ${gradient} text-white text-3xl group-hover:brightness-107 transition`}>
      {icon}
    </div>
    <h2 className="text-xl font-bold mb-2 text-gray-800 text-center">{title}</h2>
    <p className="text-gray-500 text-center">{description}</p>
  </div>
);

export default PageNavigatorCard;