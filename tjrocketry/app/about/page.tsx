"use client";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-4xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-3xl font-bold mb-6">About Us</h1>
        <p className="text-gray-300 leading-relaxed mb-6">
          TJ Rocketry is one of the most accomplished high school rocketry teams in the nation, based at
          Thomas Jefferson High School for Science and Technology in Alexandria, Virginia.
        </p>
        <p className="text-gray-300 leading-relaxed mb-6">
          We compete in the American Rocketry Challenge (TARC) and the NASA Student Launch Initiative,
          designing, building, and flying high-powered rockets. Our team is composed of talented students
          passionate about aerospace engineering, computer science, and hands-on fabrication.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Our mission is to provide students with real-world engineering experience through the design,
          construction, and flight of model and high-power rockets, fostering teamwork, innovation,
          and a love for aerospace.
        </p>
      </div>
    </div>
  );
}
