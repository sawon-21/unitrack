import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageModalProps {
  imageUrls: string[] | null;
  initialIndex?: number;
  onClose: () => void;
}

export function ImageModal({ imageUrls, initialIndex = 0, onClose }: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (imageUrls) {
      setCurrentIndex(initialIndex);
    }
  }, [imageUrls, initialIndex]);

  if (!imageUrls || imageUrls.length === 0) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : imageUrls.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < imageUrls.length - 1 ? prev + 1 : 0));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-zoom-out"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/70 rounded-full transition-all z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {imageUrls.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 p-3 text-white/70 hover:text-white bg-black/50 hover:bg-black/70 rounded-full transition-all z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 p-3 text-white/70 hover:text-white bg-black/50 hover:bg-black/70 rounded-full transition-all z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-sm font-medium z-10">
              {currentIndex + 1} / {imageUrls.length}
            </div>
          </>
        )}

        <motion.img
          key={currentIndex}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          src={imageUrls[currentIndex]}
          alt={`Zoomed image ${currentIndex + 1}`}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </motion.div>
    </AnimatePresence>
  );
}
