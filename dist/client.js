import { IBLEConnection } from "./adapters/iBleConnection.js";
import { IHTTPConnection } from "./adapters/iHttpConnection.js";
import { ISerialConnection } from "./adapters/iSerialConnection.js";
/**
 * Allows to create new connections to devices and manages them. Alternatively,
 * new connections can be created directly by instantiating their respective the
 * interface classes.
 */
export class Client {
    /** Array containing all created connection interfaces */
    deviceInterfaces;
    constructor() {
        this.deviceInterfaces = [];
    }
    /**
     * Creates a new Bluetooth Low Enery connection interface
     */
    createBLEConnection(configId) {
        const iBLEConnection = new IBLEConnection(configId);
        this.deviceInterfaces.push(iBLEConnection);
        return iBLEConnection;
    }
    /**
     * Creates a new HTTP(S) connection interface
     */
    createHTTPConnection(configId) {
        const iHTTPConnection = new IHTTPConnection(configId);
        this.deviceInterfaces.push(iHTTPConnection);
        return iHTTPConnection;
    }
    /**
     * Creates a new Serial connection interface
     */
    createSerialConnection(configId) {
        const iSerialConnection = new ISerialConnection(configId);
        this.deviceInterfaces.push(iSerialConnection);
        return iSerialConnection;
    }
    /**
     * Adds an already created connection interface to the client
     */
    addConnection(connectionObj) {
        this.deviceInterfaces.push(connectionObj);
    }
    /**
     * Removes a connection interface from the client
     */
    removeConnection(connectionObj) {
        const index = this.deviceInterfaces.indexOf(connectionObj);
        if (index !== -1) {
            this.deviceInterfaces.splice(index, 1);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRWhFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXBFOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sTUFBTTtJQUNqQix5REFBeUQ7SUFDekQsZ0JBQWdCLENBQXlCO0lBRXpDO1FBQ0UsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRUQ7O09BRUc7SUFDSSxtQkFBbUIsQ0FBQyxRQUFpQjtRQUMxQyxNQUFNLGNBQWMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNDLE9BQU8sY0FBYyxDQUFDO0lBQ3hCLENBQUM7SUFFRDs7T0FFRztJQUNJLG9CQUFvQixDQUFDLFFBQWlCO1FBQzNDLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDNUMsT0FBTyxlQUFlLENBQUM7SUFDekIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksc0JBQXNCLENBQUMsUUFBaUI7UUFDN0MsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUM5QyxPQUFPLGlCQUFpQixDQUFDO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNJLGFBQWEsQ0FBQyxhQUFtQztRQUN0RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRDs7T0FFRztJQUNJLGdCQUFnQixDQUFDLGFBQW1DO1FBQ3pELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDM0QsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDaEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDeEM7SUFDSCxDQUFDO0NBQ0YifQ==