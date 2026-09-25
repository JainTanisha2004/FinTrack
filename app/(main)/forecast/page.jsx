"use client";

import React, { useEffect, useState } from "react";
import { getForecast } from "@/actions/forecast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, CalendarDays, Loader2, Sparkles, Target } from "lucide-react";

export default function ForecastPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await getForecast();
        if (response.success) {
          setData(response.data);
        } else {
          setError("Failed to fetch forecast");
        }
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full"></div>
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 relative z-10" />
        </div>
        <p className="text-gray-500 font-medium animate-pulse">AI is analyzing your cash flow...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const parseInsight = (text) => {
    const parts = text.split(/Suggestion:/i);
    const insight = parts[0]?.replace(/Insight:/i, "").trim();
    const suggestion = parts[1]?.trim();
    return { insight, suggestion };
  };

  const { insight, suggestion } = parseInsight(data.insight);
  const currentBalance = data.currentBalance || 0;
  const day30Balance = data.predictions[30] || 0;
  const isGrowing = day30Balance > currentBalance;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            AI Cash Flow Forecast
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Predicting your financial future based on past habits and upcoming commitments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Balances Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg transform transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-blue-100 mb-4 opacity-90">
                  <Wallet size={20} />
                  <span className="font-semibold text-sm uppercase tracking-wider">Current Balance</span>
                </div>
                <div className="text-4xl font-bold">
                  ₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-4 text-sm text-blue-200">
                  Total across all your accounts
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-100 shadow-lg transform transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-gray-500 mb-4">
                  <Target size={20} className={isGrowing ? "text-emerald-500" : "text-rose-500"} />
                  <span className="font-semibold text-sm uppercase tracking-wider">30-Day Projection</span>
                </div>
                <div className="text-4xl font-bold text-gray-800">
                  ₹{day30Balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`mt-4 text-sm font-medium flex items-center gap-1 ${isGrowing ? "text-emerald-600" : "text-rose-600"}`}>
                  {isGrowing ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {isGrowing ? "+" : "-"} ₹{Math.abs(day30Balance - currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} expected change
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md border-gray-100">
            <CardHeader className="border-b border-gray-50 pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CalendarDays className="text-indigo-500" size={20} />
                Predicted Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
               <div className="relative">
                 {/* Timeline line */}
                 <div className="absolute left-8 md:left-[50%] top-0 bottom-0 w-px bg-gray-200 hidden md:block"></div>
                 
                 <div className="space-y-8">
                    {[
                      { days: 7, label: '7 Days', balance: data.predictions[7] },
                      { days: 15, label: '15 Days', balance: data.predictions[15] },
                      { days: 30, label: '30 Days', balance: data.predictions[30] }
                    ].map((pred, i) => (
                      <div key={pred.days} className="relative flex flex-col md:flex-row items-center gap-4 md:gap-8">
                         <div className="w-full md:w-1/2 flex justify-start md:justify-end">
                            <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full font-bold text-sm">
                              In {pred.label}
                            </div>
                         </div>
                         
                         <div className="hidden md:flex absolute left-1/2 -ml-2 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm z-10"></div>
                         
                         <div className="w-full md:w-1/2">
                            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                               <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Expected Balance</p>
                               <p className="text-2xl font-bold text-gray-800">
                                 ₹{pred.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               </p>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-purple-100 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 p-2 rounded-full">
                  <Sparkles className="text-purple-600" size={24} />
                </div>
                <h3 className="font-bold text-xl text-gray-800">AI Insight</h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed font-medium">
                  "{insight}"
                </p>
                {suggestion && (
                  <div className="bg-white/60 p-4 rounded-xl border border-white">
                    <p className="text-sm text-purple-700 font-semibold mb-1">Recommendation:</p>
                    <p className="text-sm text-gray-600">{suggestion}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-gray-100 flex-1">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
              <CardTitle className="text-base font-bold text-gray-800">
                Upcoming Transactions (30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="max-h-[350px] overflow-y-auto p-4 space-y-3">
                 {data.upcomingPayments.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No upcoming recurring payments found.
                    </div>
                 ) : (
                    data.upcomingPayments.map((payment, i) => (
                      <div key={payment.id || i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                         <div>
                           <p className="font-semibold text-sm text-gray-800">{payment.description}</p>
                           <p className="text-xs text-gray-500">{new Date(payment.date).toLocaleDateString()}</p>
                         </div>
                         <div className={`font-bold text-sm ${payment.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                           {payment.type === 'INCOME' ? '+' : '-'} ₹{payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </div>
                      </div>
                    ))
                 )}
               </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
