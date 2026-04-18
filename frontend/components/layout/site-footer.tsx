export function SiteFooter() {
  return (
    <footer className='border-t bg-muted/50'>
      <div className='container py-6 md:py-0'>
        <div className='flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row'>
          <div className='flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0'>
            <p className='text-center text-sm leading-loose md:text-left'>
              Built for disaster management research.
            </p>
          </div>
          <p className='text-center text-sm text-muted-foreground md:text-right px-8 md:px-0'>
            © 2026 SIG Bantul. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
