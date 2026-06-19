import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Gallery from './components/Gallery'
import Download from './components/Download'
import Footer from './components/Footer'

function ScrollToTop() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return null
}

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="main"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ position: 'relative', minHeight: '100vh' }}
      >
        <ScrollToTop />
        <Navbar />
        <main style={{ position: 'relative', zIndex: 1 }}>
          <Hero />
          <Features />
          <Gallery />
          <Download />
        </main>
        <Footer />
      </motion.div>
    </AnimatePresence>
  )
}