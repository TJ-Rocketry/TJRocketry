"use client";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const { authenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authenticated) {
      router.push("/home");
    }
  }, [loading, authenticated, router]);

  if (loading) return null;

  return (
    <div className="bg-neutral-900">
      <div className="relative w-full h-screen overflow-hidden">
        <div className="absolute inset-0 z-10">
          <img
            src="/images/hero.png"
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: "center 50%",
            }}
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div 
          className="absolute inset-0 z-15 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, rgba(0,0,0,0.5) 0%, transparent 75%)"
          }}
        />

        <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-4 select-none">
          <h1 className="text-5xl md:text-8xl text-white tracking-normal font-normal mb-6"
              style={{ fontFamily: "'DM Serif Display', sans-serif", textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
            TJ Rocketry
          </h1>
          <p className="text-lg md:text-2xl text-white max-w-3xl font-light leading-relaxed tracking-wide"
            style={{ fontFamily: "'DM Serif Display', sans-serif", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>
            One of the most accomplished high school rocketry teams in the nation.
          </p>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center animate-bounce">
          <span className="text-white/50 text-sm mb-2"></span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-48 space-y-64">
        <section className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-2xl text-white mb-6 uppercase tracking-widest">01. Design</h2>
            <p className="text-white/50 leading-relaxed">
              Before we touch any materials, we utilize simulation software like OpenRocket to predict flight performance, stability, and apogee. This involves selecting body tubes, the length of various parts, and designing fins.
            </p>
          </div>
          <img src="/images/openrocket.png" alt="Simulation" className="w-full h-auto order-1 md:order-2" />
        </section>
        <section className="grid md:grid-cols-2 gap-16 items-center">
          <img src="/images/assembleandbuild.jpg" alt="Assembly" className="w-full h-auto" />
          <div>
            <h2 className="text-2xl text-white mb-6 uppercase tracking-widest">02. Fabricate</h2>
            <p className="text-white/50 leading-relaxed">
              After we select our design, we begin construction. We build our rockets for the American Rocketry Challenge, involving assembling the body tubes, a motor mount, fins, and various other parts. We also assemble our recovery systems, which are vital for the safe landing of the rockets.
            </p>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-16 items-center">
          <img src="/images/prepareforeachlaunch.jpg" alt="Preparation" className="w-full h-auto" />
          <div>
            <h2 className="text-2xl text-white mb-6 uppercase tracking-widest">03. Launch</h2>
            <p className="text-white/50 leading-relaxed">
              Before each launch, we must ensure every part of the rocket, including the parachute, and motor is primed for flight.
            </p>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-2xl text-white mb-6 uppercase tracking-widest">04. Ascend</h2>
            <p className="text-white/50 leading-relaxed">
              The moment of ignition. Our rockets reach altitudes of up to several thousands of feet, descending smoothly after parachute deployment.
            </p>
          </div>
          <img src="/images/botrlaunch.jpg" alt="Launch" className="w-full h-auto order-1 md:order-2" />
        </section>

        <section className="grid md:grid-cols-2 gap-16 items-center">
          <img src="/images/battleoftherockets.png" alt="Competition" className="w-full h-auto" />
          <div>
            <h2 className="text-2xl text-white mb-6 uppercase tracking-widest">05. Compete</h2>
            <p className="text-white/50 leading-relaxed">
              Competing at the highest levels, including Battle of the Rockets and TARC (now NASA Student Launch Initiative for 2026-2027), where we represent TJ on the national level.
            </p>
          </div>
        </section>

        <section className="text-center py-24">
          <h2 className="text-2xl text-white mb-8 uppercase tracking-[0.2em]">Ready for Liftoff</h2>
          <img src="/images/havefunlandscape.jpg" alt="Team Success" className="w-full h-auto mb-12" />
          <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">
            Beyond the rocket design and engineering, we are a group of students learning, building, and having fun together.
          </p>
        </section>
        <div className="text-center py-16 border-white/10 my-24">
            <p className="text-white/30 text-md mb-12">2025-2026 Season</p>
            <div className="flex flex-col md:flex-row justify-center gap-16 md:gap-24">

              <div className="flex flex-col gap-2">
                <span className="text-6xl text-white font-light" style={{ fontFamily: "'DM Serif Display', sans-serif" }}>Top 20</span>
                <span className="text-white/40 text-mds">ARC National Ranking</span>
              </div>

              <div className="w-px bg-white/10 hidden md:block" />

              <div className="flex flex-col gap-2">
                <span className="text-6xl text-white font-light" style={{ fontFamily: "'DM Serif Display', sans-serif" }}>2</span>
                <span className="text-white/40 text-md">Teams at TARC Finals</span>
              </div>

            </div>
          </div>
                  <div className="text-center">
          <p className="text-white/90 max-w-2xl rounded mx-auto leading-relaxed">
            Interested in joining for the 2026-2027 season? We have two competitons we compete in:
          </p>

          <div className="grid md:grid-cols-2 gap-4 mt-10 text-left">

            <div className="flex flex-col gap-3 p-8 bg-neutral-800 border border-neutral-300">
              <h3 className="text-2xl text-amber-100">TARC</h3>
              <p className="text-amber-100/40 text-xs">Team America Rocketry Challenge</p>
              <p className="text-white/50 leading-relaxed text-sm mt-2">
                The world's largest student rocketry contest. Teams design, build, and fly a model rocket
                to a precise target altitude for an exact flight duration all scored for accuracy.
                National finals are held in The Plains, VA.
              </p>
            </div>

            <div className="flex flex-col gap-3 p-8 bg-neutral-800 border border-neutral-300">
              <h3 className="text-2xl text-blue-100">NASA SLI</h3>
              <p className="text-blue-100/40 text-xs">Student Launch Initiative</p>
              <p className="text-white/50 leading-relaxed text-sm mt-2">
                A year-long NASA program to design, build, and fly a high-powered rocket with a
                payload.
              </p>
            </div>
          </div>
            <Link href="/apply" className="inline-block mx-auto rounded center mt-8 px-10 py-4 bg-white text-neutral-900 text-sm hover:bg-white/90 transition-colors duration-200">
              Apply for 2026-2027
            </Link>
        </div>
      </div>

      <footer className="py-12 border-t border-white/10 max-w-[1440px] mx-auto">
        <div className="px-4 sm:px-8 lg:px-12">
          <p className="text-white font-semibold text-3xl left mb-2">TJ Rocketry</p>
          <p className="text-neutral-300 text-lg left">Facebook: <Link className="hover:underline" href="https://www.facebook.com/groups/tjrocketry/">https://www.facebook.com/groups/tjrocketry/</Link></p>
          <p className="text-neutral-300 text-lg left">Developed by Elijah Feldman</p>
        </div>
      </footer>
    </div>
  );
}
