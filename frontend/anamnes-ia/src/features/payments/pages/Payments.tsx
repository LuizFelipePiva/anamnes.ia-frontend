import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { MainMenu } from '@/shared/components';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'credit' | 'debit' | 'pix';
  icon: React.ReactNode;
  lastDigits?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

const Payments: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('premium');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('pix');
  const [showCheckout, setShowCheckout] = useState(false);
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const plans: Plan[] = [
    {
      id: 'basic',
      name: 'Básico',
      price: 29.9,
      features: ['Até 10 consultas por mês', 'Histórico de 30 dias', 'Suporte por email'],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 59.9,
      features: [
        'Consultas ilimitadas',
        'Histórico completo',
        'Suporte prioritário',
        'Relatórios avançados',
        'Integração com prontuários',
      ],
      popular: true,
    },
    {
      id: 'professional',
      name: 'Profissional',
      price: 99.9,
      features: [
        'Tudo do Premium',
        'Múltiplos usuários',
        'API personalizada',
        'Treinamento dedicado',
        'Suporte 24/7',
      ],
    },
  ];

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'pix',
      name: 'PIX',
      type: 'pix',
      icon: <CreditCard size={22} />,
    },
    {
      id: 'credit',
      name: 'Cartão de Crédito',
      type: 'credit',
      icon: <CreditCard size={22} />,
      lastDigits: '**** 1234',
    },
    {
      id: 'debit',
      name: 'Cartão de Débito',
      type: 'debit',
      icon: <CreditCard size={22} />,
      lastDigits: '**** 5678',
    },
  ];

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
  };

  const currencyBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handlePayment = () => {
    setShowCheckout(true);
  };

  const onPayNow = () => {
    const selectedPlanData = plans.find((plan) => plan.id === selectedPlan);

    if (selectedPlanData) {
      if (method === 'pix') {
        alert(`Processando pagamento PIX de ${currencyBRL(selectedPlanData.price)}`);
      } else if (method === 'card') {
        if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
          alert('Por favor, preencha todos os dados do cartão');
          return;
        }
        alert(`Processando pagamento no cartão de ${currencyBRL(selectedPlanData.price)}`);
      }
      setShowCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6fa]">
      {/* Aurora */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={{
        background: [
          'radial-gradient(ellipse 65% 55% at 0% 0%, rgba(138,91,255,0.20) 0%, transparent 70%)',
          'radial-gradient(ellipse 55% 50% at 100% 0%, rgba(99,179,237,0.16) 0%, transparent 70%)',
          'radial-gradient(ellipse 45% 40% at 100% 100%, rgba(122,85,255,0.13) 0%, transparent 70%)',
        ].join(', '),
      }} />
      {/* Dot grid */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(122,85,255,0.18) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />
      <div className="flex flex-col sm:flex-row min-h-screen relative z-10">
      <div className="sm:block hidden self-start sticky top-0">
        <MainMenu />
      </div>
      <div className="sm:hidden w-full fixed top-0 left-0 z-10">
        <MainMenu mobile />
      </div>
      <div className="sm:hidden h-20 w-full" />

      <div className="flex-1 flex flex-col items-center pt-8 sm:pt-12 px-4 sm:px-8 w-full">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#844AF5] mb-4 flex items-center justify-center gap-2"><CreditCard size={32} /> Pagamentos</h1>
            <p className="text-gray-600 text-lg">Escolha seu plano e forma de pagamento</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-[#844AF5] mb-6 text-center">Escolha seu Plano</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all duration-200 ${
                    selectedPlan === plan.id ? 'ring-2 ring-[#844AF5] transform scale-105' : 'hover:shadow-xl hover:scale-102'
                  } ${plan.popular ? 'border-2 border-[#844AF5]' : ''}`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-[#844AF5] text-white px-4 py-1 rounded-full text-sm font-semibold">Mais Popular</span>
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-[#844AF5]">R$ {plan.price.toFixed(2)}</span>
                      <span className="text-gray-500">/mês</span>
                    </div>

                    <ul className="space-y-2 text-left">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-gray-600">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[#844AF5] mb-6 text-center">Forma de Pagamento</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {paymentMethods.map((paymentMethod) => (
                <div
                  key={paymentMethod.id}
                  className={`bg-white rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                    selectedPaymentMethod === paymentMethod.id ? 'ring-2 ring-[#844AF5] bg-purple-50' : 'hover:shadow-lg'
                  }`}
                  onClick={() => handlePaymentMethodSelect(paymentMethod.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{paymentMethod.icon}</span>
                      <div>
                        <div className="font-semibold text-gray-800">{paymentMethod.name}</div>
                        {paymentMethod.lastDigits && <div className="text-sm text-gray-500">{paymentMethod.lastDigits}</div>}
                      </div>
                    </div>
                    {selectedPaymentMethod === paymentMethod.id && <span className="text-[#844AF5] text-xl">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-[#844AF5] mb-4">Resumo do Pagamento</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Plano selecionado:</span>
                <span className="font-semibold">{plans.find((p) => p.id === selectedPlan)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor mensal:</span>
                <span className="font-semibold">R$ {plans.find((p) => p.id === selectedPlan)?.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Forma de pagamento:</span>
                <span className="font-semibold">{paymentMethods.find((m) => m.id === selectedPaymentMethod)?.name}</span>
              </div>
              <hr className="my-4" />
              <div className="flex justify-between text-lg font-bold text-[#844AF5]">
                <span>Total:</span>
                <span>R$ {plans.find((p) => p.id === selectedPlan)?.price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handlePayment}
              className="bg-[#844AF5] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-[#6F3CBB] transition-all duration-200 hover:scale-105 shadow-lg inline-flex items-center gap-2"
            >
              <CreditCard size={20} /> Finalizar Pagamento
            </button>
            <p className="text-sm text-gray-500 mt-4">Seus dados estão protegidos com criptografia SSL</p>
          </div>
        </div>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold">Finalizar pagamento</h3>
              <button onClick={() => setShowCheckout(false)} className="text-gray-500 hover:text-gray-700 text-xl">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium">Detalhes do pedido</h4>
                <p className="text-sm text-gray-600">
                  {plans.find((p) => p.id === selectedPlan)?.name} — {currencyBRL(plans.find((p) => p.id === selectedPlan)?.price || 0)}
                </p>

                <div className="mt-4">
                  <label className="text-sm block mb-1">Método</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMethod('pix')}
                      className={`px-3 py-2 rounded-lg border ${method === 'pix' ? 'bg-[#F0EEFF] border-[#7C5CFF]' : 'border-gray-300'}`}
                    >
                      Pix
                    </button>
                    <button
                      onClick={() => setMethod('card')}
                      className={`px-3 py-2 rounded-lg border ${method === 'card' ? 'bg-[#F0EEFF] border-[#7C5CFF]' : 'border-gray-300'}`}
                    >
                      Cartão
                    </button>
                  </div>
                </div>

                {method === 'pix' && (
                  <div className="mt-4">
                    <h5 className="font-medium">Pix</h5>
                    <p className="text-sm text-gray-600 mb-2">Escaneie o QR Code ou copie a chave abaixo para pagar.</p>
                    <div className="border rounded-lg p-4 flex flex-col items-center gap-3">
                      <div className="w-40 h-40 bg-gray-100 grid place-items-center text-xs text-gray-500 rounded-lg">QR Code (gerar no backend)</div>
                      <div className="text-sm break-all text-center">chave-pix-exemplo@seudominio.com</div>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText('chave-pix-exemplo@seudominio.com');
                          alert('Chave PIX copiada!');
                        }}
                        className="px-3 py-2 rounded-lg border hover:bg-gray-50"
                      >
                        Copiar chave
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Ao confirmar, o sistema marcará como 'aguardando pagamento' e verificará automaticamente (se integrado ao provider).
                    </p>
                  </div>
                )}

                {method === 'card' && (
                  <div className="mt-4">
                    <h5 className="font-medium">Cartão de Crédito</h5>
                    <p className="text-sm text-gray-600 mb-2">Insira os dados do cartão (exemplo, não processa pagamento).</p>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        placeholder="Nome no cartão"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C5CFF]"
                      />
                      <input
                        placeholder="Número do cartão"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C5CFF]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="MM/AA"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C5CFF]"
                        />
                        <input
                          placeholder="CVV"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C5CFF]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <aside className="bg-[#FBFBFF] border rounded-lg p-4">
                <h4 className="font-medium">Confirmar pagamento</h4>
                <p className="text-sm text-gray-600">Resumo:</p>
                <div className="my-3">
                  <div className="flex justify-between text-sm">
                    <span>{plans.find((p) => p.id === selectedPlan)?.name}</span>
                    <strong>{currencyBRL(plans.find((p) => p.id === selectedPlan)?.price || 0)}</strong>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxas</span>
                    <strong>{currencyBRL(0)}</strong>
                  </div>
                  <div className="flex justify-between text-lg mt-2">
                    <span>Total</span>
                    <strong>{currencyBRL(plans.find((p) => p.id === selectedPlan)?.price || 0)}</strong>
                  </div>
                </div>

                <button
                  onClick={onPayNow}
                  className="w-full py-3 rounded-lg bg-[#7C5CFF] text-white font-semibold hover:bg-[#6B4CE6] transition-colors"
                >
                  Confirmar e pagar
                </button>

                <button
                  onClick={() => setShowCheckout(false)}
                  className="w-full mt-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </aside>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Payments;


