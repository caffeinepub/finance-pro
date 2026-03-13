import Map "mo:core/Map";
import Text "mo:core/Text";
import AccessControl "./authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
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

  type SavedReport = {
    id : Text;
    reportDate : Text;
    lineName : Text;
    preAmount : Float;
    collection : Float;
    loanFee : Float;
    lending : Float;
    expense : Float;
    dynLeftJson : Text;
    dynRightJson : Text;
    leftTotal : Float;
    rightTotal : Float;
    reminder : Float;
    savedAt : Text;
    savedBy : Text;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Stable storage — survives canister upgrades (must use stable var)
  stable var stableCustomers : [(Text, Customer)] = [];
  stable var stableEMIPayments : [(Text, EMIPayment)] = [];
  stable var stableLineCategories : [(Text, LineCategory)] = [];
  stable var stableAgentAccounts : [(Text, AgentAccount)] = [];
  stable var stableSavedReports : [(Text, SavedReport)] = [];

  // In-memory working maps
  var customersMap : Map.Map<Text, Customer> = Map.empty();
  var emiPaymentsMap : Map.Map<Text, EMIPayment> = Map.empty();
  var lineCategoriesMap : Map.Map<Text, LineCategory> = Map.empty();
  var agentAccountsMap : Map.Map<Text, AgentAccount> = Map.empty();
  var savedReportsMap : Map.Map<Text, SavedReport> = Map.empty();

  // Reconstruct maps from stable arrays on first init
  do {
    for ((k, v) in stableCustomers.vals()) { customersMap.add(k, v) };
    for ((k, v) in stableEMIPayments.vals()) { emiPaymentsMap.add(k, v) };
    for ((k, v) in stableLineCategories.vals()) { lineCategoriesMap.add(k, v) };
    for ((k, v) in stableAgentAccounts.vals()) { agentAccountsMap.add(k, v) };
    for ((k, v) in stableSavedReports.vals()) { savedReportsMap.add(k, v) };
  };

  // Persist maps to stable arrays before upgrade
  system func preupgrade() {
    stableCustomers := customersMap.entries().toArray();
    stableEMIPayments := emiPaymentsMap.entries().toArray();
    stableLineCategories := lineCategoriesMap.entries().toArray();
    stableAgentAccounts := agentAccountsMap.entries().toArray();
    stableSavedReports := savedReportsMap.entries().toArray();
  };

  // Reconstruct maps from stable arrays after upgrade, then clear stable arrays
  system func postupgrade() {
    customersMap := Map.empty();
    emiPaymentsMap := Map.empty();
    lineCategoriesMap := Map.empty();
    agentAccountsMap := Map.empty();
    savedReportsMap := Map.empty();
    for ((k, v) in stableCustomers.vals()) { customersMap.add(k, v) };
    for ((k, v) in stableEMIPayments.vals()) { emiPaymentsMap.add(k, v) };
    for ((k, v) in stableLineCategories.vals()) { lineCategoriesMap.add(k, v) };
    for ((k, v) in stableAgentAccounts.vals()) { agentAccountsMap.add(k, v) };
    for ((k, v) in stableSavedReports.vals()) { savedReportsMap.add(k, v) };
    stableCustomers := [];
    stableEMIPayments := [];
    stableLineCategories := [];
    stableAgentAccounts := [];
    stableSavedReports := [];
  };

  // Customer Management
  public shared func addOrUpdateCustomer(customer : Customer) : async () {
    customersMap.add(customer.id, customer);
  };

  public query func getCustomers() : async [Customer] {
    customersMap.values().toArray();
  };

  public shared func deleteCustomer(id : Text) : async () {
    customersMap.remove(id);
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
  public shared func addOrUpdateEMIPayment(payment : EMIPayment) : async () {
    emiPaymentsMap.add(payment.id, payment);
  };

  public query func getEMIPayments() : async [EMIPayment] {
    emiPaymentsMap.values().toArray();
  };

  public shared func deleteEMIPayment(paymentId : Text) : async () {
    emiPaymentsMap.remove(paymentId);
  };

  // Line Categories Management — bulk replace (admin overwrites all)
  public shared func setLineCategories(categories : [LineCategory]) : async () {
    lineCategoriesMap := Map.empty();
    for (category in categories.vals()) {
      lineCategoriesMap.add(category.id, category);
    };
  };

  public query func getLineCategories() : async [LineCategory] {
    lineCategoriesMap.values().toArray();
  };

  // Agent Accounts Management — bulk replace (same pattern as line categories)
  public shared func setAgentAccounts(agents : [AgentAccount]) : async () {
    agentAccountsMap := Map.empty();
    for (agent in agents.vals()) {
      agentAccountsMap.add(agent.id, agent);
    };
  };

  public query func getAgentAccounts() : async [AgentAccount] {
    agentAccountsMap.values().toArray();
  };

  // Saved Reports Management
  // Key = lineName:reportDate for last-write-wins per line+date
  public shared func addOrUpdateSavedReport(report : SavedReport) : async () {
    let key = report.lineName # ":" # report.reportDate;
    savedReportsMap.add(key, report);
  };

  public query func getSavedReports() : async [SavedReport] {
    savedReportsMap.values().toArray();
  };

  public shared func deleteSavedReport(id : Text) : async () {
    // id here is the composite key lineName:reportDate
    savedReportsMap.remove(id);
  };
};
