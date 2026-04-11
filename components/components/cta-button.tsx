type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export default function CTAButton({ href, children, className = '' }: Props) {
  return (
    <a href={href} className={`button-primary inline-block w-full max-w-sm rounded-full ${className}`}>
      {children}
    </a>
  );
}
