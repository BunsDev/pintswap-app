import { ReactNode } from 'react';
import { Tab } from '@headlessui/react';

type ICardProps = {
    children: ReactNode | string;
    className?: string;
    header?: string | ReactNode;
    scroll?: boolean;
    type?: 'default' | 'skeleton' | 'tabs' | 'inner';
    tabs?: string[];
};

export const Card = ({ children, className, header, scroll, type, tabs }: ICardProps) => {
    if(type === 'skeleton') {
        return (
            <div role="status" className="w-full animate-pulse">
                <div className={`${className ? className : ''} bg-neutral-800 h-[5rem] rounded-lg shadow w-full`}></div>
            </div>
        )
    }
    if(type === 'tabs') {
        return (
        <Tab.Group>
            <div
                className={`flex flex-col bg-neutral-900 pt-3 p-4 lg:px-6 rounded-lg shadow w-full transition duration-200 ${className}`}
            >
                {tabs && !header && (
                    <div className="text-lg text-center mb-4 lg:mb-6 font-semibold">
                        <Tab.List className="grid grid-cols-2 gap-2 lg:gap-4">
                            {tabs.map((tab, i) => (
                                <Tab key={`tabs-${i}`} className="focus-visible:outline-none">
                                    {({ selected }) => (
                                        <button className={`${selected ? 'border-indigo-600' : 'border-neutral-800 text-neutral-400 hover:text-neutral-300'} border-b-2 lg:border-b-4 rounded w-full pb-2 transition duration-200`}>
                                            {tab}
                                        </button>
                                    )}
                                </Tab>
                            ))}
                        </Tab.List>
                    </div>
                )}
                <div className={`w-full ${scroll ? 'overflow-y-auto max-h-[60vh]' : ''}`}>
                    <Tab.Panels>
                        {children}
                    </Tab.Panels>
                </div>
            </div>
        </Tab.Group>
        )
    }
    if(type === 'inner') {
        return (
            <div
                className={`flex flex-col bg-neutral-800 pt-3 p-4 lg:px-6 rounded-lg shadow-inner shadow-neutral-700 w-full transition duration-200 ${className}`}
            >
                {header && !tabs && <h3 className="text-lg xl:text-xl text-center mb-4 lg:mb-6 font-semibold">{header}</h3>}
                <div className={`w-full ${scroll ? 'overflow-y-auto max-h-[60vh]' : ''}`}>
                    {children}
                </div>
            </div>
        );
    }
    return (
        <div
            className={`flex flex-col bg-neutral-900 pt-3 p-4 lg:px-6 rounded-lg shadow w-full transition duration-200 ${className}`}
        >
            {header && !tabs && <h3 className="text-lg xl:text-xl text-center mb-4 lg:mb-6 font-semibold">{header}</h3>}
            <div className={`w-full ${scroll ? 'overflow-y-auto max-h-[60vh]' : ''}`}>
                {children}
            </div>
        </div>
    );
};
