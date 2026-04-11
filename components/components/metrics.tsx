import Link from "next/link";
import CTAButton from "./cta-button";

function Metrics({message, buttonInfo}: { message?: string, buttonInfo?: { href: string, text: string } }) {
    return (
        <div id="metrics" className="space-y-16">
            <div className="px-8 mt-16 mb-16 sm:mb-24 text-center space-y-9">
                <div className="space-y-5">
                    <div className="text-center text-lg font-medium text-mud-800">
                       {message}
                    </div>

                    {buttonInfo && (
                        <CTAButton href={buttonInfo.href}>{buttonInfo.text}</CTAButton>
                        
                    )}

                    <svg
                        width="512"
                        viewBox="0 0 512 96"
                        xmlns="http://www.w3.org/2000/svg"
                        className="mx-auto max-w-[200px]"
                    >
                        <g fill="none" fillRule="evenodd">
                            <g fillRule="nonzero">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <g key={i} transform={`translate(${i * 104}, 0)`}>
                                        <rect
                                            width="96"
                                            height="96"
                                            fill="#00B67A"
                                        />
                                        <path
                                            fill="#FFFFFF"
                                            d="M48 10l11.8 24.7L89 38.6l-20.5 20L73.6 86 48 73.1 22.4 86l4.6-27.4L6.5 38.6l29.2-3.9z"
                                            transform="scale(0.8) translate(12, 12)"
                                        />
                                    </g>
                                ))}
                            </g>
                        </g>
                    </svg>

                    <div className="text-center text-lg font-medium text-mud-800">
                        Based on 71 reviews
                    </div>
                </div>
            </div>
        </div>

    );
}
export default Metrics;