import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Home, Users, Palette, Eye } from "lucide-react";

type UserType = "homeowner" | "renter" | "designer" | "browsing";

interface UserTypeOption {
  type: UserType;
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  color: string;
}

const userTypes: UserTypeOption[] = [
  {
    type: "homeowner",
    icon: Home,
    title: "Homeowner",
    description: "Planning a renovation or new build",
    color: "bg-taupe-100 border-taupe-300 hover:bg-taupe-200",
  },
  {
    type: "renter",
    icon: Users,
    title: "Renter",
    description: "Making the most of existing space",
    color: "bg-cream-100 border-cream-300 hover:bg-cream-200",
  },
  {
    type: "designer",
    icon: Palette,
    title: "Interior Designer",
    description: "Planning for a client",
    color: "bg-charcoal-100 border-charcoal-300 hover:bg-charcoal-200",
  },
  {
    type: "browsing",
    icon: Eye,
    title: "Just Browsing",
    description: "Looking for inspiration",
    color: "bg-gray-100 border-gray-300 hover:bg-gray-200",
  },
];

export function UserTypeSelector() {
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [, navigate] = useLocation();

  const handleSelection = (type: UserType) => {
    setSelectedType(type);
    sessionStorage.setItem("userType", type);
    setTimeout(() => {
      navigate("/configure");
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {userTypes.map((option, index) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;

          return (
            <motion.button
              key={option.type}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{
                scale: 1.02,
                transition: { type: "spring", stiffness: 300 },
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelection(option.type)}
              className={`
                relative p-5 sm:p-8 rounded-2xl border-2 text-left transition-all duration-300
                min-h-[11rem] sm:min-h-[13rem]
                ${option.color}
                ${isSelected ? "ring-4 ring-charcoal-300 border-charcoal-400" : ""}
              `}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm shrink-0">
                  <Icon className="w-6 h-6 text-charcoal-500" />
                </div>

                <div className="flex-1">
                  <h3 className="font-serif text-xl sm:text-2xl font-semibold text-charcoal-600 mb-2 pr-8 sm:pr-0 leading-tight">
                    {option.title}
                  </h3>
                  <p className="text-charcoal-500 text-base sm:text-lg leading-snug">
                    {option.description}
                  </p>
                </div>
              </div>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-4 right-4 bg-charcoal-500 text-white rounded-full p-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {selectedType && (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="mt-8 text-center"
        >
          <p className="text-charcoal-400 text-lg">
            Taking you to your personalized configurator...
          </p>
        </motion.div>
      )}
    </div>
  );
}
