import Map "mo:core/Map";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import AccessControl "./authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";



actor {
  // Import existing types
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

  type LineCategory = {
    id : Text;
    name : Text;
  };

  type AgentAccount = {
    id : Text;
    username : Text;
    password : Text;
    assignedLines : [Text];
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let customersMap = Map.empty<Text, Customer>();
  let emiPaymentsMap = Map.empty<Text, EMIPayment>();
  let lineCategoriesMap = Map.empty<Text, LineCategory>();
  let agentAccountsMap = Map.empty<Text, AgentAccount>();

  // Customer Management
  public shared ({ caller }) func addOrUpdateCustomer(customer : Customer) : async () {
    customersMap.add(customer.id, customer);
  };

  public query ({ caller }) func getCustomers() : async [Customer] {
    customersMap.values().toArray();
  };

  public shared ({ caller }) func deleteCustomer(id : Text) : async () {
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

  // EMI Payments Management
  public shared ({ caller }) func addOrUpdateEMIPayment(payment : EMIPayment) : async () {
    emiPaymentsMap.add(payment.id, payment);
  };

  public query ({ caller }) func getEMIPayments() : async [EMIPayment] {
    emiPaymentsMap.values().toArray();
  };

  public shared ({ caller }) func deleteEMIPayment(paymentId : Text) : async () {
    emiPaymentsMap.remove(paymentId);
  };

  // Line Categories Management
  public shared ({ caller }) func setLineCategories(categories : [LineCategory]) : async () {
    lineCategoriesMap.clear();
    for (category in categories.values()) {
      lineCategoriesMap.add(category.id, category);
    };
  };

  public query ({ caller }) func getLineCategories() : async [LineCategory] {
    lineCategoriesMap.values().toArray();
  };

  // Agent Accounts Management
  public shared ({ caller }) func addOrUpdateAgentAccount(agent : AgentAccount) : async () {
    agentAccountsMap.add(agent.id, agent);
  };

  public query ({ caller }) func getAgentAccounts() : async [AgentAccount] {
    agentAccountsMap.values().toArray();
  };

  public shared ({ caller }) func deleteAgentAccount(id : Text) : async () {
    agentAccountsMap.remove(id);
  };
};
