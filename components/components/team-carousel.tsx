"use client"

import React, { useState } from "react";
import Image from "next/image";
import { ExternalLink, X } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCoverflow } from "swiper/modules";
import { motion, AnimatePresence } from "framer-motion";
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/effect-coverflow";
import { fadeInUp, staggerContainer } from "@/lib/animations";

// Types
interface TeamMember {
  name: string;
  role: string;
  image: string;
  linkedin: string;
  bio: string;
}

interface TeamCarouselProps {
  className?: string;
}

const TeamCarousel: React.FC<TeamCarouselProps> = ({ className = "" }) => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const teamMembers: TeamMember[] = [
    {
      name: "Alex Onyia",
      role: "Executive Director",
      image: "/images/team/alex.svg",
      linkedin: "https://www.linkedin.com/in/alex-onyia-baa39873",
      bio: "Alex is the CEO of EduCare Technology and a leading figure in Nigeria's education sector. He creates technology solutions that help students learn better and teachers teach more effectively.\n\nAs Executive Director, Alex leads programs that have helped thousands of students across Africa get better education. He works with schools, universities, and tech companies to bring digital learning to communities that need it most.\n\nAlex is recognized as one of Nigeria's top education technology leaders. He continues to fight for better education and digital skills for everyone across the continent.",
    },
    {
      name: "Gaius Chibueze",
      role: "Director",
      image: "/images/team/gauis.svg",
      linkedin: "https://x.com/gaiuschibueze",
      bio: ""
    },
    {
      name: "Udeigwe Maureen Uju",
      role: "Project Director",
      image: "/images/team/uju.svg",
      linkedin: "https://www.linkedin.com/in/uju-ibeh/",
      bio: "Uju is a skilled project manager who makes sure complex projects run smoothly from start to finish. She coordinates teams, manages resources, and ensures projects deliver real results for communities.\n\nAs Project Director, Uju has successfully managed million-dollar initiatives across multiple locations. Her careful planning and attention to detail help projects stay on track and achieve their goals.\n\nUju is known for her ability to bring people together and navigate challenges while keeping everyone focused on the mission.",
    },
    {
      name: "James Nnayelugo",
      role: "Chief Tech Officer",
      image: "/images/team/james.svg",
      linkedin: "https://www.linkedin.com/in/jamesnnanyelugo/",
      bio: "James is a Senior Software Engineer with 9 years of experience building technology that serves millions of users worldwide. He specializes in creating systems that can handle large amounts of traffic while staying fast and reliable.\n\nAs Chief Tech Officer, James has built systems that reduced downtime by 40% and made deployments 60% more efficient. He leads our technical strategy while mentoring other developers.\n\nJames is known for his ability to solve complex technical problems and build teams that create innovative solutions.",
    },
    {
      name: "Christian Onoh",
      role: "Lead Engineer",
      image: "https://www.christianonoh.com/me.png",
      linkedin: "https://www.christianonoh.com",
      bio: "Christian is a Lead Engineer who builds technology that creates positive change in communities. He designs and develops systems that help organizations measure their impact and connect with the people they serve.\n\nChristian leads engineering teams in creating platforms that power social good projects. He believes that great technology should make the world a better place.\n\nWhen he's not writing code, Christian mentors young developers and explores how new technologies can help solve social problems.",
    },
  ];

  const duplicatedTeam = [...teamMembers, ...teamMembers];

  const handleReadBio = (member: TeamMember) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
  };

  return (
    <>
      <motion.section
        className={`py-24 ${className}`}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <div className="mx-auto">
          <motion.div className="relative" variants={fadeInUp}>
            <Swiper
              modules={[Autoplay, EffectCoverflow]}
              spaceBetween={24}
              slidesPerView={1}
              centeredSlides={true}
              loop={true}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }}
              speed={800}
              effect="coverflow"
              coverflowEffect={{
                rotate: 0,
                stretch: 0,
                depth: 100,
                modifier: 1,
                slideShadows: false,
              }}
              breakpoints={{
                640: {
                  slidesPerView: 1.5,
                  spaceBetween: 24,
                },
                768: {
                  slidesPerView: 2,
                  spaceBetween: 32,
                },
                1024: {
                  slidesPerView: 2.5,
                  spaceBetween: 40,
                },
                1280: {
                  slidesPerView: 3,
                  spaceBetween: 48,
                },
              }}
              className="team-swiper"
            >
              {duplicatedTeam.map((member: TeamMember, index: number) => (
                <SwiperSlide
                  key={`${member.name}-${index}`}
                  className="!h-auto"
                >
                  <motion.div
                    className="group cursor-pointer h-full"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    <div className="rounded-3xl overflow-hidden relative transition-all duration-500 shadow-lg hover:shadow-2xl bg-white h-full">
                      <div className="aspect-[4/5] relative overflow-hidden">
                        <Image
                          src={member.image}
                          alt={member.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
                        <div className="text-center text-white">
                          <p className="text-sm font-medium text-white/70 mb-1 uppercase tracking-wider">
                            {member.role}
                          </p>
                          <h3 className="text-xl font-bold mb-4 group-hover:text-theme-100 transition-colors">
                            {member.name}
                          </h3>

                          <div className="flex items-center justify-center space-x-3">
                            <button
                              onClick={() => handleReadBio(member)}
                              className="text-white/80 hover:text-white transition-colors text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20 hover:border-white/30"
                            >
                              Read bio
                            </button>
                            <a
                              href={member.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white/80 hover:text-white transition-colors p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm border border-white/20 hover:border-white/30"
                              aria-label={`View ${member.name}'s LinkedIn profile`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Instruction text */}
            <motion.p
              className="text-center text-theme-600 mt-8 text-sm"
              variants={fadeInUp}
            >
              Auto-rotating every 3 seconds • Hover to pause
            </motion.p>
          </motion.div>
        </div>

        <style jsx global>{`
          .team-swiper {
            padding: 20px 0 40px 0;
            overflow: visible;
          }

          .team-swiper .swiper-slide {
            transition: transform 0.3s ease;
            opacity: 0.7;
          }

          .team-swiper .swiper-slide-active {
            opacity: 1;
            transform: scale(1.05);
          }

          .team-swiper .swiper-slide-next,
          .team-swiper .swiper-slide-prev {
            opacity: 0.8;
          }
        `}</style>
      </motion.section>

      {/* Bio Modal */}
      <AnimatePresence>
        {isModalOpen && selectedMember && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal Content */}
            <motion.div
              className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Content */}
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden mx-auto sm:mx-0">
                    <Image
                      src={selectedMember.image}
                      alt={selectedMember.name}
                      width={160}
                      height={160}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>

                {/* Bio Content */}
                <div className="flex-1">
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-medium text-theme-600 dark:text-theme-400 mb-2 uppercase tracking-wider">
                      {selectedMember.role}
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                      {selectedMember.name}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 whitespace-pre-line">
                      {selectedMember.bio}
                    </p>

                    {/* LinkedIn Link */}
                    <a
                      href={selectedMember.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-theme-600 hover:text-theme-700 dark:text-theme-400 dark:hover:text-theme-300 transition-colors font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View LinkedIn Profile
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TeamCarousel;
