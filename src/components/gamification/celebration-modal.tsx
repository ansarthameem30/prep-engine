import { motion, AnimatePresence } from 'framer-motion'
import { useGamificationStore } from '@/stores/gamification-store'
import { Button } from '@/components/ui/button'

export function CelebrationModal() {
  const { achievements, lastCelebration, dismissCelebration } = useGamificationStore()
  const unlocked = achievements.find((a) => a.id === lastCelebration)

  return (
    <AnimatePresence>
      {unlocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="max-w-sm rounded-2xl border border-primary/30 bg-card p-8 text-center shadow-2xl"
          >
            <div className="text-5xl">{unlocked.icon}</div>
            <h2 className="mt-4 text-2xl font-bold">Achievement unlocked!</h2>
            <p className="mt-2 text-lg font-medium">{unlocked.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{unlocked.description}</p>
            <Button className="mt-6 w-full" onClick={dismissCelebration}>
              Keep going
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
