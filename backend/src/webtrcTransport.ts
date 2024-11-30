import axios from "axios";


// Function to fetch public IP address
const getPublicIP = async () => {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        return response.data.ip;
    } catch (error) {
        console.error('Error fetching public IP:', error);
        return '0.0.0.0'; // Fallback to a default IP
    }
};

export const createWebRtcTransport = async (router: any):Promise<any> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Get public IP dynamically
            //const publicIp = await getPublicIP();

            const webRtcTransport_options = {
                listenIps: [
                    {
                        ip: '192.168.0.108', // Bind to all available interfaces
                        //announcedIp: publicIp, // Public IP addressde
                    }
                ],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
            };

            let transport = await router.createWebRtcTransport(webRtcTransport_options);
            console.log(`Transport id: ${transport.id}`);

            transport.on('dtlsstatechange', (dtlsState: any) => {
                if (dtlsState === 'closed') {
                    transport.close();
                }
            });

            transport.on('close', () => {
                console.log('Transport closed');
            });

            resolve(transport);

        } catch (error) {
            reject(error);
        }
    });
};
