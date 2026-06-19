"use client";

export default function ApplyPage() {
  return (
    <div className="pt-32 min-h-screen bg-neutral-900 text-white flex flex-col items-center">
      <div className="max-w-3xl w-full px-4 text-center">
        <h1 className="text-5xl tracking-tight mb-6">Join TJRocketry</h1>
        <p className="text-lg text-neutral-400 mb-12">Applications are currently open for the upcoming season. We're looking for passionate students to join our engineering teams.</p>
        
        <div className="bg-neutral-900 border border-neutral-700 p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Application Form</h2>
          <p className="text-neutral-400 mb-8">Please fill out the form below to apply for membership.</p>
          
          <button className="w-full border border-white text-black bg-neutral-200 font-bold py-3 px-6 hover:bg-neutral-100 transition-colors">
            Start Application
          </button>
        </div>
      </div>
    </div>
  );
}
