import {
    Box, Tabs as ChakraTabs, Tab, TabList, TabPanels, useColorMode
} from '@chakra-ui/react'
import { useMemo, useState, Suspense } from 'react';
import PrimarySelect from '../../Components/Inputs/PrimarySelect';
import Notifications from './Notifications';
import { TabsType } from './types';
import Users from './Users';
import Departments from './Departments';
import General from './General';
import Machines from './Machines';
import Equipments from './Equipments';
import WorkSchedule from './WorkSchedule';
import { Helmet } from 'react-helmet';
import { FaExclamation } from 'react-icons/fa';
import MyCard from '../../Components/micro/Card';
import NotFound from '../../Components/micro/NotFound';
import Listen from '../../Components/Store/hooks/Listen';
import { isMasterAdminAtom, roleAtom, uidAtom } from '../../Components/Store/atoms';
import { isAdminUser } from '../../Services/rbac';

const Settings = () => {
    const { colorMode } = useColorMode();
    const { border, subText, navBG } = useMemo(() => ({
        border: `${colorMode}.border`,
        subText: `${colorMode}.subText`,
        navBG: `${colorMode}.navBG`,
    }), [colorMode]);
    const masterUid = Listen(uidAtom);
    Listen(roleAtom);
    Listen(isMasterAdminAtom);
    const hasSettingsAccess = isAdminUser(masterUid);
    const [activeTab, setActiveTab] = useState<TabsType>("general" as TabsType);


    const Tabs: TabsType[] = [
        "general",
        "work schedule",
        "users",
        "departments",
        "devices & notificaions",
        "machines",
        "equipments",
    ];

    return <Box
        borderColor={border}>
        <Helmet>
            <title>Settings | industrialpmr</title>
        </Helmet>
        {!hasSettingsAccess ? (
            <MyCard p={4}>
                <NotFound h="200px" text="Unauthorized access" icon={FaExclamation} />
            </MyCard>
        ) : (
        <ChakraTabs colorScheme={"orange"}>
            <PrimarySelect
                bgColor={navBG}
                textTransform="capitalize"
                fontWeight={500}
                onChange={e => setActiveTab(e.target.value as TabsType)}
                display={{
                    base: "flex",
                    sm: "none"
                }}>
                {Tabs.map((tab) => (
                    <option
                        key={tab}
                        value={tab}>
                        {tab}
                    </option>
                ))}
            </PrimarySelect>
            <TabList display={{
                base: "none",
                sm: "flex"
            }}>
                {Tabs.map((tab) => (
                    <Tab
                        color={subText}
                        fontWeight={500}
                        _active={{
                            bgColor: undefined
                        }}
                        _selected={{
                            borderColor: "orange.500",
                            color: "orange.500"
                        }}
                        key={tab}
                        textTransform="capitalize"
                        onClick={() => setActiveTab(tab)}>
                        {tab}
                    </Tab>
                ))}
            </TabList>
            <TabPanels mt={"20px"}>
                {
                    activeTab === "general" ? <Suspense fallback={<div>Loading...</div>}>
                        <General />
                    </Suspense>
                        : activeTab === "work schedule" ? <Suspense fallback={<div>Loading...</div>}>
                            <WorkSchedule />
                        </Suspense>
                        : activeTab === "users" ? <Suspense fallback={<div>Loading...</div>}>
                            <Users />
                        </Suspense>
                            : activeTab === "departments" ? <Suspense fallback={<div>Loading...</div>}>
                                <Departments />
                            </Suspense>
                                : activeTab === "devices & notificaions" ? <Suspense fallback={<div>Loading...</div>}>
                                    <Notifications />
                                </Suspense>
                                    : activeTab === "machines" ? <Suspense fallback={<div>Loading...</div>}>
                                        <Machines />
                                    </Suspense>
                                        : activeTab === "equipments" ? <Suspense fallback={<div>Loading...</div>}>
                                            <Equipments />
                                        </Suspense>
                                            : null
                }
            </TabPanels>
        </ChakraTabs>
        )}
    </Box>
}

export default Settings