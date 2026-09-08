"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow"><span className="pulse"/> SHARED STAYS FOR PROFESSIONALS & STUDENTS</p>
          <h1>Relocating? Find a <em>reliable home base.</em></h1>
          <p className="hero-text">Designed specifically for students and working professionals relocating for education or work. Connect with respectful housemates and find a practical shared stay.</p>
          <div className="trust-row"><span>✦ Built for shared stays, not dating</span><span>✦ Clear home-fit reasons</span></div>
        </div>
        <div className="hero-art" aria-label="Illustration of connected future roommates">
          <div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="spark s-one">✦</div><div className="spark s-two">✦</div>
          <div className="avatar avatar-main"><span>🙂</span></div><div className="avatar avatar-a"><span>🧑🏽‍💻</span></div><div className="avatar avatar-b"><span>👩🏽‍🎨</span></div>
          <div className="match-bubble"><b>96%</b><span>home fit</span></div>
        </div>
      </section>

      <section className="how shell" id="how" style={{ marginTop: "80px" }}>
        <div className="how-intro">
          <p className="eyebrow">LESS GUESSING, MORE BELONGING</p>
          <h2>Good living starts with a good fit.</h2>
          <p>Roomie combines the practical things you need with the everyday things that matter.</p>
        </div>
        <div className="steps">
          <div><span>01</span><h3>Tell us your essentials</h3><p>Budget, location and timing filter out what will not work.</p></div>
          <div><span>02</span><h3>Share your living style</h3><p>Food, routines, guests, quiet time and the little things in between.</p></div>
          <div><span>03</span><h3>Meet with context</h3><p>Every recommendation comes with simple, human match reasons.</p></div>
        </div>
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button className="match-button" onClick={() => router.push("/matches")}>Get Started <span>→</span></button>
        </div>
      </section>

      <footer className="footer" style={{ marginTop: "80px" }}>
        <div className="shell">
          <div className="brand footer-brand"><span className="brand-mark">R</span><span>roomie<span className="dot">.</span></span></div>
          <p>Find a practical, respectful shared home in your new city.</p>
          <span>Designed for better shared stays.</span>
        </div>
      </footer>
    </main>
  );
}
