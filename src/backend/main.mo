import Map "mo:core/Map";
import Text "mo:core/Text";
import Prim "mo:prim";
import Runtime "mo:core/Runtime";
import AccessControl "./authorization/access-control";

actor Backend {
  type Customer = {
    id : Text;
    serialNumber : Text;
    name : Text;
    phone : Text;
    address : Text;
    loanAmount : Float;
    loanInterest : Float;
    loanType : Text;
    loanFee : Float;
    lineCategoryId : Text;
    createdAt : Text;
    createdBy : Text;
    isActive : Bool;
  };

  type EMIPayment = {
    id : Text;
    customerId : Text;
    amount : Float;
    paymentDate : Text;
    recordedBy : Text;
    createdAt : Text;
  };

  let accessControlState = AccessControl.initState();

  public shared ({ caller }) func _initializeAccessControlWithSecret(userSecret : Text) : async () {
    switch (Prim.envVar<system>("CAFFEINE_ADMIN_TOKEN")) {
      case (null) {
        Runtime.trap("CAFFEINE_ADMIN_TOKEN environment variable is not set");
      };
      case (?adminToken) {
        AccessControl.initialize(accessControlState, caller, adminToken, userSecret);
      };
    };
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  let customersMap = Map.empty<Text, Customer>();
  let emiPaymentsMap = Map.empty<Text, EMIPayment>();

  public func addOrUpdateCustomer(customer : Customer) : async () {
    customersMap.add(customer.id, customer);
  };

  public query func getCustomers() : async [Customer] {
    customersMap.values().toArray();
  };

  public func deleteCustomer(id : Text) : async () {
    customersMap.remove(id);
    // Remove associated EMI payments
    let toRemove = Map.empty<Text, Bool>();
    for ((pid, p) in emiPaymentsMap.entries()) {
      if (Text.equal(p.customerId, id)) {
        toRemove.add(pid, true);
      };
    };
    for (pid in toRemove.keys()) {
      emiPaymentsMap.remove(pid);
    };
  };

  public func addOrUpdateEMIPayment(payment : EMIPayment) : async () {
    emiPaymentsMap.add(payment.id, payment);
  };

  public query func getEMIPayments() : async [EMIPayment] {
    emiPaymentsMap.values().toArray();
  };

  public func deleteEMIPayment(paymentId : Text) : async () {
    emiPaymentsMap.remove(paymentId);
  };
}
