'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    title: 'Peta Interaktif',
    href: '/map',
    description: 'Visualisasi GIS dengan layer zona rawan, shelter, dan jalur evakuasi',
  },
  {
    title: 'Data Gempa',
    href: '/earthquakes',
    description: 'Histori dan data gempa bumi dari BMKG',
  },
  {
    title: 'Manajemen Evakuasi',
    href: '/evacuation',
    description: 'Rekomendasi jalur evakuasi utama dan alternatif',
  },
  {
    title: 'Edukasi',
    href: '/education',
    description: 'Tips evakuasi dan SOP gempa bumi',
  },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='container flex h-16 items-center px-4'>
        <div className='mr-4 flex'>
          <Link href='/' className='mr-6 flex items-center space-x-2'>
            <svg
              className='h-6 w-6 text-red-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
              />
            </svg>
            <span className='hidden font-bold sm:inline-block'>
              SIG Bantul
            </span>
          </Link>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className='grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]'>
                    <li className='row-span-3'>
                      <Link
                        className='flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-red-500/50 to-red-600 p-6 no-underline outline-none focus:shadow-md'
                        href='/'
                      >
                        <svg
                          className='h-6 w-6 text-white'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064'
                          />
                        </svg>
                        <div className='mb-2 mt-4 text-lg font-medium text-white'>
                          Sistem Informasi Geografis
                        </div>
                        <p className='text-sm leading-tight text-white/90'>
                          Manajemen Krisis Gempa Bumi Kabupaten Bantul
                        </p>
                      </Link>
                    </li>
                    {menuItems.map((item) => (
                      <li key={item.title}>
                        <Link
                          href={item.href}
                          className={cn(
                            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                            pathname === item.href && 'bg-accent'
                          )}
                        >
                          <div className='text-sm font-medium leading-none'>
                            {item.title}
                          </div>
                          <p className='line-clamp-2 text-sm leading-snug text-muted-foreground'>
                            {item.description}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href='/map' className={navigationMenuTriggerStyle()}>
                  Peta
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href='/earthquakes' className={navigationMenuTriggerStyle()}>
                  Gempa
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href='/evacuation' className={navigationMenuTriggerStyle()}>
                  Evakuasi
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className='flex flex-1 items-center justify-end space-x-4'>
          <nav className='flex items-center space-x-2'>
            <Link
              href='/admin/login'
              className='text-sm font-medium text-muted-foreground hover:text-primary'
            >
              Login Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
